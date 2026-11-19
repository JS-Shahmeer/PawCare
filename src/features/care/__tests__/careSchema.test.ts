import { alertChoiceFor, careInputSchema, type CareFormValues } from '../logic/careSchema';

const base: CareFormValues = {
  petId: 'p1',
  type: 'medication',
  title: ' Heart pill ',
  date: '2026-11-20',
  hasTime: true,
  time: '18:30',
  repeat: 'daily',
  intervalDays: '',
  alert: '0',
  notes: '',
};

describe('careInputSchema (PC-03)', () => {
  it('builds a timed daily reminder', () => {
    expect(careInputSchema.parse(base)).toEqual({
      petId: 'p1',
      type: 'medication',
      title: 'Heart pill',
      startLocal: '2026-11-20T18:30',
      hasExplicitTime: true,
      recurrence: { kind: 'daily' },
      alertLeadMin: 0,
      notes: null,
    });
  });

  it('stores date-only tasks at 00:00 without a time flag', () => {
    const r = careInputSchema.parse({ ...base, hasTime: false, time: '' });
    expect(r.startLocal).toBe('2026-11-20T00:00');
    expect(r.hasExplicitTime).toBe(false);
  });

  it('accepts a custom interval and validates it', () => {
    expect(careInputSchema.parse({ ...base, repeat: 'interval', intervalDays: '14' }).recurrence).toEqual({ kind: 'interval', days: 14 });
    for (const bad of ['', '1', '0', '2.5', '400', 'abc']) {
      expect(careInputSchema.safeParse({ ...base, repeat: 'interval', intervalDays: bad }).success).toBe(false);
    }
  });

  it('requires a pet, title, valid date and a time when one is set', () => {
    expect(careInputSchema.safeParse({ ...base, petId: '' }).success).toBe(false);
    expect(careInputSchema.safeParse({ ...base, title: '  ' }).success).toBe(false);
    expect(careInputSchema.safeParse({ ...base, date: '2026-02-30' }).success).toBe(false);
    expect(careInputSchema.safeParse({ ...base, time: '25:00' }).success).toBe(false);
  });

  it('maps alert choices to minutes and back', () => {
    expect(careInputSchema.parse({ ...base, alert: 'off' }).alertLeadMin).toBeNull();
    expect(careInputSchema.parse({ ...base, alert: '1440' }).alertLeadMin).toBe(1440);
    expect(alertChoiceFor(60)).toBe('60');
    expect(alertChoiceFor(null)).toBe('off');
    expect(alertChoiceFor(7)).toBe('off');
  });
});
