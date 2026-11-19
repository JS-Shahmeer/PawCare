import { ageFromBirthDate, isValidIsoDate, todayIso } from '../dates';

describe('dates', () => {
  it('validates real calendar dates', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2023-02-29')).toBe(false);
    expect(isValidIsoDate('2024-13-01')).toBe(false);
    expect(isValidIsoDate('2024-1-01')).toBe(false);
  });

  it('formats today in local time', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('computes whole years and months', () => {
    expect(ageFromBirthDate('2020-03-15', '2026-11-19')).toEqual({ years: 6, months: 8 });
    expect(ageFromBirthDate('2026-11-19', '2026-11-19')).toEqual({ years: 0, months: 0 });
  });
});
