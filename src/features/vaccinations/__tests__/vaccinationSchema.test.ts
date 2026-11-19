import { todayIso } from '@/lib/dates';

import { dueReminderTitle, nextDueStatus, vaccinationInputSchema } from '../logic/vaccinationSchema';

const base = { petId: 'p1', vaccineName: ' Rabies ', administeredOn: '2026-01-10', vetName: '', nextDueOn: '', notes: '' };

describe('vaccination rules', () => {
  it('cleans values and allows a record without next due', () => {
    expect(vaccinationInputSchema.parse(base)).toEqual({ petId: 'p1', vaccineName: 'Rabies', administeredOn: '2026-01-10', vetName: null, nextDueOn: null, notes: null });
  });

  it('allows today but not a future administered date (R01)', () => {
    expect(vaccinationInputSchema.safeParse({ ...base, administeredOn: todayIso() }).success).toBe(true);
    const r = vaccinationInputSchema.safeParse({ ...base, administeredOn: '2999-01-01' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toMatch(/care reminder/);
  });

  it('requires the next due date to be after the administered date', () => {
    expect(vaccinationInputSchema.safeParse({ ...base, nextDueOn: '2026-01-10' }).success).toBe(false);
    expect(vaccinationInputSchema.safeParse({ ...base, nextDueOn: '2027-01-10' }).success).toBe(true);
    expect(vaccinationInputSchema.safeParse({ ...base, nextDueOn: '2027-02-30' }).success).toBe(false);
  });

  it('requires a vaccine name and a valid date', () => {
    const r = vaccinationInputSchema.safeParse({ ...base, vaccineName: '  ', administeredOn: '' });
    expect(r.error?.issues.map((i) => i.message)).toEqual(expect.arrayContaining(['Enter the vaccine name', 'Choose the date it was given']));
  });

  it('labels the next due date with scheduling statuses only', () => {
    expect(nextDueStatus(null, '2026-11-19', 3)).toBeNull();
    expect(nextDueStatus('2026-11-18', '2026-11-19', 3)).toBe('overdue');
    expect(nextDueStatus('2026-11-19', '2026-11-19', 3)).toBe('dueSoon');
    expect(nextDueStatus('2026-11-22', '2026-11-19', 3)).toBe('dueSoon');
    expect(nextDueStatus('2026-11-23', '2026-11-19', 3)).toBe('upcoming');
  });

  it('builds a reminder title within the limit', () => {
    expect(dueReminderTitle('Rabies')).toBe('Rabies due');
    expect(dueReminderTitle('x'.repeat(80)).length).toBe(60);
  });
});
