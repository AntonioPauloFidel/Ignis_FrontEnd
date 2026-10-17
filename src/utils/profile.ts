export function safeNumber(value: unknown, fallback = 0): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function formatMinutesLabel(minutes: number): string {
  const totalMinutes = Math.max(0, Math.round(safeNumber(minutes, 0)));

  if (totalMinutes < 60) {
    return `${totalMinutes} min`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes} min`;
}

export function formatGoalType(type: string | undefined): string {
  switch (type) {
    case 'DAILY':
      return 'Meta diária';
    case 'WEEKLY':
      return 'Meta semanal';
    case 'MONTHLY':
      return 'Meta mensal';
    default:
      return 'Meta';
  }
}

export function normalizeProgress(value: number | null | undefined): number {
  const numeric = safeNumber(value, 0);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric < 0) {
    return 0;
  }
  if (numeric > 100) {
    return 100;
  }
  return numeric;
}

export function formatUserField(value: unknown, fallback = 'Não informado'): string {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  return String(value);
}

export function formatDate(value: string | undefined | null): string {
  if (!value) {
    return 'Não informado';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Não informado';
  }

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
