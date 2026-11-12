export const CYCLE_TITLE_MAX = 80;
export const UNTITLED_CYCLE = 'Ciclo sem título';

/** Nome a mostrar: o título do ciclo ou um texto padrão quando não tem. */
export function cycleTitle(cycle: { title?: string | null }): string {
  const title = typeof cycle.title === 'string' ? cycle.title.replace(/\s+/g, ' ').trim() : '';
  return title || UNTITLED_CYCLE;
}

/** 25 -> "25 min", 60 -> "1h", 90 -> "1h 30min". */
export function formatCycleDuration(minutes: number): string {
  const total = Math.max(0, Math.round(Number.isFinite(minutes) ? minutes : 0));

  if (total < 60) return `${total} min`;

  const hours = Math.floor(total / 60);
  const rest = total % 60;

  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

const pad = (value: number) => String(value).padStart(2, '0');

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** "Hoje, 14:30", "Ontem, 09:00" ou "10/11, 18:20"; vazio quando a data é inválida. */
export function formatCycleDate(value: string | null | undefined, now: Date = new Date()): string {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);

  if (days === 0) return `Hoje, ${time}`;
  if (days === 1) return `Ontem, ${time}`;

  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}, ${time}`;
}

/** Tempo parado no ciclo, ex.: "Pausas: 3 min". Nulo quando não houve pausa. */
export function formatPausedTime(seconds: number | null | undefined): string | null {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total <= 0) return null;

  return `Pausas: ${Math.max(1, Math.round(total / 60))} min`;
}

/** mm:ss de um contador regressivo. */
export function formatRemaining(seconds: number | null | undefined): string {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

/** Texto digitado pelo aluno: sem espaços sobrando e com no máximo 80 caracteres. */
export function normalizeTitleInput(text: string): string {
  return text.replace(/\s+/g, ' ').trim().slice(0, CYCLE_TITLE_MAX);
}
