import { quizVerdict, scoreQuiz } from '../quiz';

describe('scoreQuiz', () => {
  it('conta os acertos e calcula a porcentagem', () => {
    expect(scoreQuiz([0, 1, 2, 3], [0, 1, 0, 3])).toEqual({ correct: 3, total: 4, percent: 75 });
  });

  it('resposta em branco conta como erro', () => {
    expect(scoreQuiz([1, 1], [1, null])).toEqual({ correct: 1, total: 2, percent: 50 });
  });

  it('quiz vazio não divide por zero', () => {
    expect(scoreQuiz([], [])).toEqual({ correct: 0, total: 0, percent: 0 });
  });
});

describe('quizVerdict', () => {
  it.each([
    [100, 'Excelente'],
    [75, 'Muito bem'],
    [50, 'Bom começo'],
    [20, 'Revise'],
  ])('%i%% -> %s', (percent, start) => {
    expect(quizVerdict(percent)).toContain(start);
  });
});
