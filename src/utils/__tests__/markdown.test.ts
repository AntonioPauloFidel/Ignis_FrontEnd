import { parseInline, parseMarkdown } from '../markdown';

describe('parseInline', () => {
  it('reconhece negrito, itálico, código e link', () => {
    expect(parseInline('um **forte**, *leve*, `x = 1` e [site](https://a.com)')).toEqual([
      { type: 'text', text: 'um ' },
      { type: 'bold', children: [{ type: 'text', text: 'forte' }] },
      { type: 'text', text: ', ' },
      { type: 'italic', children: [{ type: 'text', text: 'leve' }] },
      { type: 'text', text: ', ' },
      { type: 'code', text: 'x = 1' },
      { type: 'text', text: ' e ' },
      { type: 'link', text: 'site', url: 'https://a.com' },
    ]);
  });

  it('não confunde multiplicação ou snake_case com itálico', () => {
    expect(parseInline('2 * 3 * 4 e meu_arquivo_final')).toEqual([
      { type: 'text', text: '2 * 3 * 4 e meu_arquivo_final' },
    ]);
  });

  it('troca <br> por quebra de linha', () => {
    expect(parseInline('a<br>b<br/>c')).toEqual([{ type: 'text', text: 'a\nb\nc' }]);
  });

  it('ignora links que não são http(s)', () => {
    expect(parseInline('[x](javascript:alert(1))')).toEqual([
      { type: 'text', text: '[x](javascript:alert(1))' },
    ]);
  });
});

describe('parseMarkdown', () => {
  it('títulos, regra e parágrafos', () => {
    const blocks = parseMarkdown('# Título\n\nlinha 1\nlinha 2\n\n---\n\n### Sub');
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'rule', 'heading']);
    expect(blocks[0]).toMatchObject({ level: 1 });
    expect(blocks[3]).toMatchObject({ level: 3 });
  });

  it('listas com marcadores e numeradas, com aninhamento', () => {
    const [list, numbered] = parseMarkdown('- a\n  - b\n- c\n\n1. um\n2. dois') as any[];
    expect(list.ordered).toBe(false);
    expect(list.items.map((i: any) => i.depth)).toEqual([0, 1, 0]);
    expect(numbered.ordered).toBe(true);
    expect(numbered.items.map((i: any) => i.number)).toEqual([1, 2]);
  });

  it('bloco de código preserva o conteúdo', () => {
    const [code] = parseMarkdown('```python\nprint("**oi**")\n```') as any[];
    expect(code).toEqual({ type: 'code', lang: 'python', text: 'print("**oi**")' });
  });

  it('tabela', () => {
    const [table] = parseMarkdown('| A | B |\n|---|---|\n| 1 | **2** |\n| 3 | 4 |') as any[];
    expect(table.type).toBe('table');
    expect(table.header).toHaveLength(2);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0][1][0].type).toBe('bold');
  });

  it('citação', () => {
    expect(parseMarkdown('> frase\n> continua')[0]).toMatchObject({ type: 'quote' });
  });

  it('texto simples vira um parágrafo só', () => {
    expect(parseMarkdown('Oi, tudo bem?')).toEqual([
      { type: 'paragraph', inline: [{ type: 'text', text: 'Oi, tudo bem?' }] },
    ]);
  });
});
