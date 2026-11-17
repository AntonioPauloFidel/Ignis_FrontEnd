import type { ChatFile } from '../../api/chat';
import { sourceLabel, sourceTarget } from '../source-link';

const file = (name: string, extra: Partial<ChatFile> = {}): ChatFile => ({
  _id: name,
  name,
  size: 1,
  hasOriginal: true,
  ...extra,
});

describe('sourceTarget', () => {
  it('PDF abre na página citada', () => {
    const files = [file('aula.pdf')];
    expect(sourceTarget(files, { file: 'aula.pdf', page: 7 })).toEqual({ ok: true, file: files[0], page: 7 });
  });

  it('PDF sem página abre no começo', () => {
    const files = [file('aula.pdf')];
    expect(sourceTarget(files, { file: 'aula.pdf' })).toEqual({ ok: true, file: files[0], page: undefined });
    expect(sourceTarget(files, { file: 'aula.pdf', page: 0 })).toMatchObject({ ok: true, page: undefined });
  });

  it('Word abre o arquivo sem página', () => {
    const files = [file('resumo.DOCX')];
    expect(sourceTarget(files, { file: 'resumo.DOCX', page: 3 })).toEqual({ ok: true, file: files[0], page: undefined });
  });

  it('reconhece PDF em maiúsculas', () => {
    expect(sourceTarget([file('AULA.PDF')], { file: 'AULA.PDF', page: 2 })).toMatchObject({ ok: true, page: 2 });
  });

  it('arquivo removido da conversa vira mensagem', () => {
    const result = sourceTarget([file('outro.pdf')], { file: 'aula.pdf', page: 2 });
    expect(result).toEqual({ ok: false, message: 'O arquivo "aula.pdf" foi removido desta conversa.' });
  });

  it('arquivo sem original guardado vira mensagem', () => {
    const result = sourceTarget([file('antigo.pdf', { hasOriginal: false })], { file: 'antigo.pdf', page: 1 });
    expect(result.ok).toBe(false);
  });

  it('com nomes repetidos, prefere o que tem original', () => {
    const files = [file('aula.pdf', { _id: 'a', hasOriginal: false }), file('aula.pdf', { _id: 'b' })];
    expect(sourceTarget(files, { file: 'aula.pdf', page: 4 })).toMatchObject({ ok: true, page: 4, file: { _id: 'b' } });
  });
});

describe('sourceLabel', () => {
  it('inclui a página quando há', () => {
    expect(sourceLabel({ file: 'aula.pdf', page: 5 })).toBe('Abrir aula.pdf na página 5');
    expect(sourceLabel({ file: 'aula.pdf' })).toBe('Abrir aula.pdf');
  });
});
