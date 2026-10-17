import {
  formatGoalType,
  formatMinutesLabel,
  formatUserField,
  normalizeProgress,
  safeNumber,
} from '../../utils/profile';

describe('Profile utilities', () => {
  it('formats study minutes in a readable human format', () => {
    expect(formatMinutesLabel(0)).toBe('0 min');
    expect(formatMinutesLabel(45)).toBe('45 min');
    expect(formatMinutesLabel(90)).toBe('1h 30 min');
    expect(formatMinutesLabel(120)).toBe('2h');
  });

  it('maps goal types to readable labels', () => {
    expect(formatGoalType('DAILY')).toBe('Meta diária');
    expect(formatGoalType('WEEKLY')).toBe('Meta semanal');
    expect(formatGoalType('MONTHLY')).toBe('Meta mensal');
    expect(formatGoalType(undefined)).toBe('Meta');
  });

  it('keeps user field values readable and avoids null placeholders', () => {
    expect(formatUserField('João')).toBe('João');
    expect(formatUserField(undefined, 'Não informado')).toBe('Não informado');
    expect(formatUserField(null, 'Não informado')).toBe('Não informado');
  });

  it('normalizes progress values to a safe range and handles invalid data', () => {
    expect(normalizeProgress(0)).toBe(0);
    expect(normalizeProgress(30)).toBe(30);
    expect(normalizeProgress(150)).toBe(100);
    expect(normalizeProgress(-25)).toBe(0);
    expect(normalizeProgress(undefined)).toBe(0);
  });

  it('handles invalid numbers without silently converting them to an incorrect value', () => {
    expect(safeNumber('24')).toBe(24);
    expect(safeNumber('abc', 7)).toBe(7);
    expect(safeNumber(undefined, 3)).toBe(3);
    expect(safeNumber(NaN, 8)).toBe(8);
  });
});
