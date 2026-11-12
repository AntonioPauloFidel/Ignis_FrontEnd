import {
  cycleTitle,
  formatCycleDate,
  formatCycleDuration,
  formatPausedTime,
  formatRemaining,
  normalizeTitleInput,
} from '../cycles';

describe('cycleTitle', () => {
  it('usa o título do ciclo', () => {
    expect(cycleTitle({ title: '  Revisar   mitocôndria ' })).toBe('Revisar mitocôndria');
  });

  it.each([[null], [undefined], [''], ['   ']])('sem título (%j) mostra o texto padrão', (title) => {
    expect(cycleTitle({ title })).toBe('Ciclo sem título');
  });
});

describe('formatCycleDuration', () => {
  it.each([
    [0, '0 min'],
    [25, '25 min'],
    [59, '59 min'],
    [60, '1h'],
    [90, '1h 30min'],
    [120, '2h'],
    [-5, '0 min'],
    [NaN, '0 min'],
  ])('%s -> %s', (minutes, expected) => {
    expect(formatCycleDuration(minutes)).toBe(expected);
  });
});

describe('formatCycleDate', () => {
  const now = new Date(2026, 10, 12, 15, 0); // 12/11/2026 15:00

  it('hoje e ontem', () => {
    expect(formatCycleDate(new Date(2026, 10, 12, 9, 5).toISOString(), now)).toBe('Hoje, 09:05');
    expect(formatCycleDate(new Date(2026, 10, 11, 23, 59).toISOString(), now)).toBe('Ontem, 23:59');
  });

  it('dias anteriores mostram dia/mês', () => {
    expect(formatCycleDate(new Date(2026, 10, 3, 18, 20).toISOString(), now)).toBe('03/11, 18:20');
  });

  it('data ausente ou inválida devolve vazio', () => {
    expect(formatCycleDate(null, now)).toBe('');
    expect(formatCycleDate(undefined, now)).toBe('');
    expect(formatCycleDate('lixo', now)).toBe('');
  });
});

describe('formatPausedTime', () => {
  it('sem pausa devolve null', () => {
    expect(formatPausedTime(0)).toBeNull();
    expect(formatPausedTime(null)).toBeNull();
    expect(formatPausedTime(undefined)).toBeNull();
  });

  it('arredonda para minutos, com mínimo de 1', () => {
    expect(formatPausedTime(20)).toBe('Pausas: 1 min');
    expect(formatPausedTime(180)).toBe('Pausas: 3 min');
  });
});

describe('formatRemaining', () => {
  it.each([
    [1500, '25:00'],
    [65, '01:05'],
    [0, '00:00'],
    [-3, '00:00'],
    [undefined, '00:00'],
  ])('%s -> %s', (seconds, expected) => {
    expect(formatRemaining(seconds as number)).toBe(expected);
  });
});

describe('normalizeTitleInput', () => {
  it('limpa espaços e limita a 80 caracteres', () => {
    expect(normalizeTitleInput('  Prova   de   bio ')).toBe('Prova de bio');
    expect(normalizeTitleInput('a'.repeat(120))).toHaveLength(80);
    expect(normalizeTitleInput('   ')).toBe('');
  });
});
