import type { ChatMessage } from '../../api/chat';
import { redoTarget, withReplacedExchange } from '../redo';

const user = (content = 'pergunta', extra: Partial<ChatMessage> = {}): ChatMessage => ({ _id: 'u', role: 'user', content, ...extra });
const ai = (content = 'resposta', extra: Partial<ChatMessage> = {}): ChatMessage => ({ _id: 'a', role: 'assistant', content, ...extra });

describe('redoTarget', () => {
  it('aponta a última pergunta e a última resposta da IA', () => {
    expect(redoTarget([user('p1'), ai('r1'), user('p2'), ai('r2')], false)).toEqual({ userIndex: 2, assistantIndex: 3 });
    expect(redoTarget([user(), ai()], false)).toEqual({ userIndex: 0, assistantIndex: 1 });
  });

  it('não dá para refazer enquanto a resposta está chegando', () => {
    expect(redoTarget([user(), ai()], true)).toBeNull();
  });

  it('não dá sem troca completa (vazio, só uma mensagem, resposta ainda vazia ou sem id)', () => {
    expect(redoTarget([], false)).toBeNull();
    expect(redoTarget([user()], false)).toBeNull();
    expect(redoTarget([user(), ai('')], false)).toBeNull();
    expect(redoTarget([user(), ai('r', { _id: undefined })], false)).toBeNull();
  });

  it('não dá quando a troca foi direta do banco (criar meta, estudei 2h)', () => {
    expect(redoTarget([user('Criar meta', { direct: true }), ai('Meta criada', { direct: true })], false)).toBeNull();
    expect(redoTarget([user('p'), ai('r', { direct: true })], false)).toBeNull();
    expect(redoTarget([user('p', { direct: true }), ai('r')], false)).toBeNull();
  });

  it('não dá se a ordem estiver errada', () => {
    expect(redoTarget([ai(), user()], false)).toBeNull();
    expect(redoTarget([user(), user()], false)).toBeNull();
  });
});

describe('withReplacedExchange', () => {
  it('tira a última troca e põe a nova pergunta com resposta vazia, sem mexer no resto', () => {
    const before = [user('p1'), ai('r1'), user('p2'), ai('r2')];

    expect(withReplacedExchange(before, 'p2 corrigida')).toEqual([
      user('p1'),
      ai('r1'),
      { role: 'user', content: 'p2 corrigida' },
      { role: 'assistant', content: '' },
    ]);
    expect(before).toHaveLength(4); // não altera a lista original (ela é usada para voltar atrás)
  });
});
