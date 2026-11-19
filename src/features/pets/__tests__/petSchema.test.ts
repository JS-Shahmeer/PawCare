import { petInputSchema } from '../logic/petSchema';

const today = new Date();
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('petInputSchema (PC-01)', () => {
  it('accepts a pet with only name and species', () => {
    const r = petInputSchema.parse({ name: '  Bella ', species: 'dog' });
    expect(r).toEqual({
      name: 'Bella',
      species: 'dog',
      breed: null,
      birthDate: null,
      ageLabel: null,
      sex: null,
      notes: null,
      photoPath: null,
    });
  });

  it('requires a name', () => {
    const r = petInputSchema.safeParse({ name: '   ', species: 'cat' });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe('Enter a name');
  });

  it('requires dog or cat', () => {
    expect(petInputSchema.safeParse({ name: 'Rex' }).success).toBe(false);
    expect(petInputSchema.safeParse({ name: 'Rex', species: 'rabbit' }).success).toBe(false);
  });

  it('turns empty optional fields into null (unknown values)', () => {
    const r = petInputSchema.parse({ name: 'Milo', species: 'cat', breed: '', birthDate: '', notes: '  ' });
    expect(r.breed).toBeNull();
    expect(r.birthDate).toBeNull();
    expect(r.notes).toBeNull();
  });

  it('rejects an impossible or badly formatted birth date', () => {
    expect(petInputSchema.safeParse({ name: 'A', species: 'dog', birthDate: '2024-02-30' }).success).toBe(false);
    expect(petInputSchema.safeParse({ name: 'A', species: 'dog', birthDate: '12/03/2024' }).success).toBe(false);
  });

  it('rejects a birth date in the future but accepts today', () => {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const future = petInputSchema.safeParse({ name: 'A', species: 'dog', birthDate: iso(tomorrow) });
    expect(future.success).toBe(false);
    expect(future.error?.issues[0].message).toBe('Birth date cannot be in the future');
    expect(petInputSchema.safeParse({ name: 'A', species: 'dog', birthDate: iso(today) }).success).toBe(true);
  });

  it('keeps an approximate age only when there is no birth date', () => {
    expect(petInputSchema.parse({ name: 'A', species: 'dog', ageLabel: 'about 3 years' }).ageLabel).toBe('about 3 years');
    expect(
      petInputSchema.parse({ name: 'A', species: 'dog', ageLabel: 'about 3 years', birthDate: '2022-01-01' }).ageLabel,
    ).toBeNull();
  });

  it('handles long names and limits', () => {
    expect(petInputSchema.safeParse({ name: 'x'.repeat(40), species: 'dog' }).success).toBe(true);
    expect(petInputSchema.safeParse({ name: 'x'.repeat(41), species: 'dog' }).success).toBe(false);
    expect(petInputSchema.safeParse({ name: 'A', species: 'dog', notes: 'n'.repeat(1001) }).success).toBe(false);
  });
});
