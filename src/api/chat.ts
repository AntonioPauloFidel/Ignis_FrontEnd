import { Linking, Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export interface ChatSummary {
  _id: string;
  title: string;
  studyMinutes?: number;
  updatedAt: string;
}

export interface ChatSource {
  file: string;
  page?: number;
}

export interface ChatMessage {
  _id?: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

export interface ChatFile {
  _id: string;
  name: string;
  size: number;
  hasOriginal?: boolean;
}

export interface ChatDetail {
  id: string;
  title: string;
  studyMinutes: number;
  messages: ChatMessage[];
  files: ChatFile[];
}

export interface PickedFile {
  name: string;
  uri: string;
  mimeType?: string;
  file?: File; // web
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: { Accept: 'application/json', ...(init.headers ?? {}) },
  });

  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? 'Erro ao acessar a API.');
  }

  return data as T;
}

const json = (body: object): RequestInit => ({
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const listChats = () => request<ChatSummary[]>('/chats');

export const createChat = () =>
  request<{ _id: string }>('/chats', { method: 'POST', ...json({}) });

export const getChat = (id: string) => request<ChatDetail>(`/chats/${id}`);

export const renameChat = (id: string, title: string) =>
  request<{ id: string; title: string }>(`/chats/${id}`, { method: 'PATCH', ...json({ title }) });

export const deleteChat = (id: string) => request(`/chats/${id}`, { method: 'DELETE' });

export const addStudyTime = (id: string, minutes: number) =>
  request<{ studyMinutes: number }>(`/chats/${id}/study-time`, {
    method: 'PATCH',
    ...json({ minutes }),
  });

export async function uploadChatFile(id: string, picked: PickedFile): Promise<ChatFile> {
  const form = new FormData();

  if (Platform.OS === 'web' && picked.file) {
    form.append('file', picked.file, picked.name);
  } else {
    form.append('file', {
      uri: picked.uri,
      name: picked.name,
      type: picked.mimeType ?? 'application/octet-stream',
    } as unknown as Blob);
  }

  const result = await request<{ id: string; name: string; size: number }>(
    `/chats/${id}/files`,
    { method: 'POST', body: form },
  );

  return { _id: result.id, name: result.name, size: result.size, hasOriginal: true };
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export type MaterialType = 'summary' | 'flashcards' | 'quiz';

export interface StudyMaterial {
  _id: string;
  type: MaterialType;
  fileName?: string;
  createdAt: string;
  content: string | Flashcard[] | QuizQuestion[];
}

export const generateMaterial = (
  chatId: string,
  body: { type: MaterialType; fileId?: string; count?: number },
) => request<StudyMaterial>(`/chats/${chatId}/material`, { method: 'POST', ...json(body) });

export const listMaterial = (chatId: string) => request<StudyMaterial[]>(`/chats/${chatId}/material`);

export const deleteMaterial = (chatId: string, materialId: string) =>
  request(`/chats/${chatId}/material/${materialId}`, { method: 'DELETE' });

export const deleteChatFile = (chatId: string, fileId: string) =>
  request(`/chats/${chatId}/files/${fileId}`, { method: 'DELETE' });

/** Abre o PDF/DOCX original que o aluno enviou (guardado no servidor). */
export async function openChatFile(chatId: string, fileId: string): Promise<void> {
  const url = `${API_BASE_URL}/chats/${chatId}/files/${fileId}`;

  if (Platform.OS !== 'web') {
    await Linking.openURL(url);
    return;
  }

  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? 'Não foi possível abrir o arquivo.');
  }

  const blobUrl = URL.createObjectURL(await response.blob());
  window.open(blobUrl, '_blank');
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

// No celular o fetch padrão não faz streaming; o do Expo faz.
function streamingFetch(): typeof fetch {
  if (Platform.OS === 'web') return fetch;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo/fetch').fetch as typeof fetch;
}

const isAbort = (error: unknown) => (error as { name?: string })?.name === 'AbortError';

/**
 * Envia a mensagem e chama onDelta a cada pedaço da resposta da IA.
 * Se o aluno cancelar pelo `signal`, termina sem erro e o texto parcial já recebido é mantido.
 */
export async function sendMessageStream(
  id: string,
  content: string,
  onDelta: (piece: string) => void,
  signal?: AbortSignal,
  onSources?: (sources: ChatSource[]) => void,
): Promise<void> {
  try {
    await readStream(id, content, onDelta, signal, onSources);
  } catch (error) {
    if (signal?.aborted && isAbort(error)) return;
    throw error;
  }
}

async function readStream(
  id: string,
  content: string,
  onDelta: (piece: string) => void,
  signal?: AbortSignal,
  onSources?: (sources: ChatSource[]) => void,
): Promise<void> {
  const response = await streamingFetch()(`${API_BASE_URL}/chats/${id}/messages`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => null);
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message ?? 'Não foi possível enviar a mensagem.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const event of events) {
      if (!event.startsWith('data:')) continue;

      const payload = JSON.parse(event.slice(5).trim());

      if (payload.type === 'delta') onDelta(payload.content);
      if (payload.type === 'sources') onSources?.(payload.sources);
      if (payload.type === 'error') throw new Error(payload.message);
    }
  }
}
