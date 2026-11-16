export const MIN_SEARCH_CHARS = 2;
export const SEARCH_DELAY_MS = 300;

/** Só busca com pelo menos 2 caracteres (o back devolve 400 abaixo disso). */
export const searchable = (q: string) => q.trim().length >= MIN_SEARCH_CHARS;

/** Minúsculas e sem acento, letra por letra, para as posições continuarem iguais às do texto original. */
export function fold(text: string): string {
  return Array.from(text, (char) => char.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()[0] ?? char).join('');
}

export interface Segment {
  text: string;
  match: boolean;
}

/**
 * Divide o texto em pedaços para destacar as palavras da busca, ignorando acento e maiúscula.
 * O destaque vai até o fim da palavra, para o plural também aparecer ("mitocondria" marca "mitocôndrias").
 */
export function highlight(text: string, query: string): Segment[] {
  const terms = [...new Set(fold(query).split(/\s+/).filter((term) => term.length >= MIN_SEARCH_CHARS))];
  if (!terms.length || !text) return [{ text, match: false }];

  const folded = fold(text);
  const marked = new Array<boolean>(text.length).fill(false);

  for (const term of terms) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(term, from);
      if (at < 0) break;

      let end = at + term.length;
      while (end < text.length && /[\p{L}\p{N}]/u.test(text[end])) end++;
      for (let i = at; i < end; i++) marked[i] = true;
      from = end;
    }
  }

  const segments: Segment[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = segments[segments.length - 1];
    if (last && last.match === marked[i]) last.text += text[i];
    else segments.push({ text: text[i], match: marked[i] });
  }

  return segments;
}
