import type { ChatMessage } from '../../api/chat';
import { canRate, toggleFeedback } from '../feedback';

describe('toggleFeedback', () => {
  it('apertar um botão sem avaliação marca', () => {
    expect(toggleFeedback(null, 'up')).toBe('up');
    expect(toggleFeedback(undefined, 'down')).toBe('down');
  });

  it('apertar o botão já marcado remove a avaliação', () => {
    expect(toggleFeedback('up', 'up')).toBeNull();
    expect(toggleFeedback('down', 'down')).toBeNull();
  });

  it('apertar o outro botão troca a avaliação', () => {
    expect(toggleFeedback('up', 'down')).toBe('down');
    expect(toggleFeedback('down', 'up')).toBe('up');
  });
});

describe('canRate', () => {
  const answer: ChatMessage = { _id: 'm1', role: 'assistant', content: 'Resposta da IA' };

  it('resposta da IA já salva pode ser avaliada', () => {
    expect(canRate(answer, false)).toBe(true);
  });

  it('não avalia enquanto a resposta ainda está chegando', () => {
    expect(canRate(answer, true)).toBe(false);
  });

  it('não avalia sem id (ainda não salva), sem texto, pergunta do aluno nem resposta direta do banco', () => {
    expect(canRate({ ...answer, _id: undefined }, false)).toBe(false);
    expect(canRate({ ...answer, content: '' }, false)).toBe(false);
    expect(canRate({ ...answer, role: 'user' }, false)).toBe(false);
    expect(canRate({ ...answer, direct: true }, false)).toBe(false);
  });
});
