import { fold, highlight, searchable } from '../chat-search';

describe('searchable', () => {
  it('exige 2 caracteres, sem contar espaços nas pontas', () => {
    expect(searchable('')).toBe(false);
    expect(searchable('a')).toBe(false);
    expect(searchable(' a ')).toBe(false);
    expect(searchable('ab')).toBe(true);
    expect(searchable('  ab ')).toBe(true);
  });
});

describe('fold', () => {
  it('tira acento e maiúscula sem mudar o tamanho', () => {
    expect(fold('Mitocôndria É AÇÃO')).toBe('mitocondria e acao');
    expect(fold('Mitocôndria É AÇÃO')).toHaveLength('Mitocôndria É AÇÃO'.length);
  });
});

describe('highlight', () => {
  const marcado = (text: string, q: string) => highlight(text, q).filter((s) => s.match).map((s) => s.text);

  it('destaca ignorando acento e maiúscula', () => {
    expect(marcado('A Mitocôndria produz ATP', 'mitocondria')).toEqual(['Mitocôndria']);
  });

  it('o destaque vai até o fim da palavra (plural)', () => {
    expect(marcado('As mitocôndrias produzem energia', 'mitocondria')).toEqual(['mitocôndrias']);
  });

  it('destaca todas as ocorrências e várias palavras', () => {
    expect(marcado('célula e célula com núcleo', 'celula nucleo')).toEqual(['célula', 'célula', 'núcleo']);
  });

  it('os pedaços juntos reconstroem o texto original', () => {
    const texto = 'O núcleo da Célula';
    expect(highlight(texto, 'celula').map((s) => s.text).join('')).toBe(texto);
  });

  it('sem ocorrência ou busca curta, devolve o texto inteiro sem destaque', () => {
    expect(highlight('nada aqui', 'zzz')).toEqual([{ text: 'nada aqui', match: false }]);
    expect(highlight('nada aqui', 'a')).toEqual([{ text: 'nada aqui', match: false }]);
    expect(highlight('', 'abc')).toEqual([{ text: '', match: false }]);
  });
});
