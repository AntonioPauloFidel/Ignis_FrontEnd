// Parser de markdown pequeno, só com o que a IA usa nas respostas.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; children: Inline[] }
  | { type: 'italic'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string };

export type Block =
  | { type: 'heading'; level: number; inline: Inline[] }
  | { type: 'paragraph'; inline: Inline[] }
  | { type: 'list'; ordered: boolean; items: { inline: Inline[]; depth: number; number?: number }[] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'quote'; inline: Inline[] }
  | { type: 'table'; header: Inline[][]; rows: Inline[][][] }
  | { type: 'rule' };

const INLINE_PATTERN =
  /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(__[^_\n]+?__)|(\[[^\]\n]+\]\(https?:\/\/[^)\s]+\))|(\*[^*\s][^*\n]*?\*)|(?<![A-Za-z0-9])(_[^_\s][^_\n]*?_)(?![A-Za-z0-9])/g;

export function parseInline(text: string): Inline[] {
  const result: Inline[] = [];
  let last = 0;

  for (const match of text.matchAll(INLINE_PATTERN)) {
    const [token] = match;
    const index = match.index ?? 0;

    if (index > last) result.push({ type: 'text', text: text.slice(last, index) });

    if (token.startsWith('`')) {
      result.push({ type: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('**') || token.startsWith('__')) {
      result.push({ type: 'bold', children: parseInline(token.slice(2, -2)) });
    } else if (token.startsWith('[')) {
      const split = token.indexOf('](');
      result.push({ type: 'link', text: token.slice(1, split), url: token.slice(split + 2, -1) });
    } else {
      result.push({ type: 'italic', children: parseInline(token.slice(1, -1)) });
    }

    last = index + token.length;
  }

  if (last < text.length) result.push({ type: 'text', text: text.slice(last) });

  return result;
}

const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());

const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line) && line.includes('-');

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r/g, '').split('\n');
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: 'paragraph', inline: parseInline(paragraph.join('\n')) });
      paragraph = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fence = line.match(/^\s*```\s*([\w+-]*)\s*$/);
    if (fence) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) body.push(lines[i++]);
      blocks.push({ type: 'code', lang: fence[1], text: body.join('\n') });
      continue;
    }

    if (!line.trim()) {
      flush();
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      blocks.push({ type: 'rule' });
      continue;
    }

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (heading) {
      flush();
      blocks.push({ type: 'heading', level: heading[1].length, inline: parseInline(heading[2]) });
      continue;
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flush();
      const header = splitRow(line).map(parseInline);
      const rows: Inline[][][] = [];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitRow(lines[i]).map(parseInline));
        i++;
      }
      i--;
      blocks.push({ type: 'table', header, rows });
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      flush();
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ''));
      i--;
      blocks.push({ type: 'quote', inline: parseInline(quote.join('\n')) });
      continue;
    }

    const item = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
    if (item) {
      flush();
      const ordered = /\d/.test(item[2]);
      const items: { inline: Inline[]; depth: number; number?: number }[] = [];

      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
        if (!m || /\d/.test(m[2]) !== ordered) break;
        items.push({
          inline: parseInline(m[3]),
          depth: Math.min(Math.floor(m[1].replace(/\t/g, '  ').length / 2), 3),
          number: ordered ? parseInt(m[2], 10) : undefined,
        });
        i++;
      }

      i--;
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    paragraph.push(line);
  }

  flush();

  return blocks;
}
