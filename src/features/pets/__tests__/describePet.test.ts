import { ageText, deleteImpactMessage, initial, petSubtitle } from '../logic/describePet';

describe('petSubtitle', () => {
  it('joins known parts and skips unknown ones', () => {
    expect(petSubtitle({ species: 'dog', breed: 'Golden Retriever', birthDate: '2023-06-01', ageLabel: null }, '2026-11-19')).toBe(
      'Dog · Golden Retriever · 3 yrs',
    );
    expect(petSubtitle({ species: 'cat', breed: null, birthDate: null, ageLabel: null })).toBe('Cat');
    expect(petSubtitle({ species: 'cat', breed: null, birthDate: null, ageLabel: 'about 2 years' })).toBe('Cat · about 2 years');
  });
});

describe('ageText', () => {
  it('shows months for young pets and years after that', () => {
    expect(ageText({ birthDate: '2026-11-01', ageLabel: null }, '2026-11-19')).toBe('Under 1 month');
    expect(ageText({ birthDate: '2026-10-01', ageLabel: null }, '2026-11-19')).toBe('1 month');
    expect(ageText({ birthDate: '2026-05-19', ageLabel: null }, '2026-11-19')).toBe('6 months');
    expect(ageText({ birthDate: '2025-11-19', ageLabel: null }, '2026-11-19')).toBe('1 yr');
    expect(ageText({ birthDate: '2025-11-20', ageLabel: null }, '2026-11-19')).toBe('11 months');
  });
});

describe('initial', () => {
  it('uses the first letter, uppercase', () => {
    expect(initial(' bella')).toBe('B');
    expect(initial('')).toBe('?');
  });
});

describe('deleteImpactMessage (PC-08)', () => {
  it('lists everything that will also be deleted', () => {
    expect(deleteImpactMessage('Bella', { vaccinations: 3, careEvents: 1, documents: 2 })).toBe(
      "Bella's profile and photo will be removed from this phone. This also deletes 3 vaccination records, 1 reminder or visit, 2 documents and any scheduled alerts. This cannot be undone.",
    );
  });

  it('stays short when nothing else is linked', () => {
    expect(deleteImpactMessage('Milo', { vaccinations: 0, careEvents: 0, documents: 0 })).toBe(
      "Milo's profile and photo will be removed from this phone. This cannot be undone.",
    );
  });
});
