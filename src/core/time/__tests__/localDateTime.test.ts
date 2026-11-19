import { addDays, addMonthsClamped, diffDays, localDateAt, localDateTimeAt, toInstant } from '../localDateTime';

describe('calendar math', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('is not affected by DST changes', () => {
    expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    expect(diffDays('2026-03-01', '2026-03-31')).toBe(30);
  });

  it('clamps monthly dates to the end of shorter months', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2026-01-31', 2, 31)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-11-15', 2)).toBe('2027-01-15');
  });
});

describe('timezones', () => {
  it('turns wall-clock time into the right instant', () => {
    expect(new Date(toInstant('2026-11-19T09:00', 'Asia/Karachi')).toISOString()).toBe('2026-11-19T04:00:00.000Z');
    expect(new Date(toInstant('2026-07-01T09:00', 'Europe/London')).toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(new Date(toInstant('2026-12-01T09:00', 'Europe/London')).toISOString()).toBe('2026-12-01T09:00:00.000Z');
  });

  it('moves a time inside a DST gap forward instead of failing', () => {
    // 02:30 does not exist in New York on 8 March 2026.
    expect(new Date(toInstant('2026-03-08T02:30', 'America/New_York')).toISOString()).toBe('2026-03-08T07:30:00.000Z');
  });

  it('reads the local date and time in a zone', () => {
    const t = Date.UTC(2026, 10, 19, 20, 0);
    expect(localDateAt(t, 'Asia/Karachi')).toBe('2026-11-20');
    expect(localDateAt(t, 'America/Los_Angeles')).toBe('2026-11-19');
    expect(localDateTimeAt(t, 'Australia/Sydney')).toBe('2026-11-20T07:00');
  });
});
