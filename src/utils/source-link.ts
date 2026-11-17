import type { ChatFile, ChatSource } from '../api/chat';

export type SourceTarget =
  | { ok: true; file: ChatFile; page?: number }
  | { ok: false; message: string };

const isPdf = (name: string) => name.toLowerCase().endsWith('.pdf');

/**
 * Para onde leva o toque numa fonte citada: o arquivo da conversa com esse nome e, se for PDF, a página citada.
 * Word não tem página (abre o download). Se o arquivo foi removido ou o original não foi guardado, devolve a mensagem.
 */
export function sourceTarget(files: ChatFile[], source: ChatSource): SourceTarget {
  const sameName = files.filter((file) => file.name === source.file);

  if (sameName.length === 0) {
    return { ok: false, message: `O arquivo "${source.file}" foi removido desta conversa.` };
  }

  const file = sameName.find((item) => item.hasOriginal) ?? sameName[0];

  if (!file.hasOriginal) {
    return { ok: false, message: `O original de "${source.file}" não está guardado para abrir.` };
  }

  const page = isPdf(file.name) && source.page && source.page > 0 ? source.page : undefined;
  return { ok: true, file, page };
}

/** Rótulo de acessibilidade do toque numa fonte. */
export function sourceLabel(source: ChatSource): string {
  return source.page ? `Abrir ${source.file} na página ${source.page}` : `Abrir ${source.file}`;
}
