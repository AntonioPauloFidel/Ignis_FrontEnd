import type { ChatMessage } from '../api/chat';

export interface RedoTarget {
  /** Índice da última pergunta do aluno. */
  userIndex: number;
  /** Índice da última resposta da IA. */
  assistantIndex: number;
}

/**
 * A última troca (pergunta + resposta da IA) que dá para refazer, ou null.
 * Só vale se as duas últimas mensagens são uma pergunta e uma resposta da IA já salvas (têm id e texto) e nenhuma
 * foi montada direto do banco ("criei a meta", "registrei o estudo"), que têm efeito próprio e o back recusa refazer.
 */
export function redoTarget(messages: ChatMessage[], sending: boolean): RedoTarget | null {
  if (sending || messages.length < 2) return null;

  const assistantIndex = messages.length - 1;
  const userIndex = messages.length - 2;
  const assistant = messages[assistantIndex];
  const user = messages[userIndex];

  const redoable =
    assistant.role === 'assistant' &&
    Boolean(assistant._id) &&
    Boolean(assistant.content) &&
    !assistant.direct &&
    user.role === 'user' &&
    Boolean(user.content) &&
    !user.direct;

  return redoable ? { userIndex, assistantIndex } : null;
}

/** Tela otimista de uma troca: tira o par antigo e põe a nova pergunta com a resposta ainda vazia. */
export function withReplacedExchange(messages: ChatMessage[], content: string): ChatMessage[] {
  return [...messages.slice(0, -2), { role: 'user', content }, { role: 'assistant', content: '' }];
}
