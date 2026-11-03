export interface QuizResult {
  correct: number;
  total: number;
  percent: number;
}

/** Nota do quiz: respostas em branco (null) contam como erro. */
export function scoreQuiz(correctAnswers: number[], answers: (number | null)[]): QuizResult {
  const total = correctAnswers.length;
  const correct = correctAnswers.filter((answer, index) => answers[index] === answer).length;

  return { correct, total, percent: total === 0 ? 0 : Math.round((correct / total) * 100) };
}

export function quizVerdict(percent: number): string {
  if (percent >= 90) return 'Excelente! Você domina o conteúdo.';
  if (percent >= 70) return 'Muito bem! Falta pouco para dominar.';
  if (percent >= 50) return 'Bom começo. Vale revisar os pontos que errou.';
  return 'Revise o material e tente de novo.';
}
