import { fireEvent, render, screen } from '@testing-library/react-native';

import { toInstant } from '@/core/time/localDateTime';

import { buildAgenda as mockBuildAgenda, type AgendaInput } from '../logic/agenda';

const mockTZ = 'Asia/Karachi';
const mockNow = toInstant('2026-11-19T12:00', mockTZ);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (...a: unknown[]) => mockPush(...a) } }));
jest.mock('@/core/ui/AddButton', () => ({ AddButton: () => null }));
jest.mock('@/lib/useNow', () => ({ useNow: () => mockNow }));
jest.mock('@/core/time/localDateTime', () => ({ ...jest.requireActual('@/core/time/localDateTime'), deviceTimeZone: () => 'Asia/Karachi' }));
jest.mock('@/features/pets/components/PetRow', () => {
  const { Text } = jest.requireActual('react-native');
  return { PetRow: ({ pet }: { pet: { name: string } }) => <Text>{pet.name}</Text> };
});

const mockPets = [
  { id: 'bella', name: 'Bella' },
  { id: 'milo', name: 'Milo' },
];
const mockState = { pets: mockPets as { id: string; name: string }[] };
const mockToggle = jest.fn().mockResolvedValue(undefined);
jest.mock('@/features/pets/repo', () => ({ usePets: () => ({ data: mockState.pets, updatedAt: new Date() }) }));

const mockData: AgendaInput = {
  events: [
    { id: 'walk', petId: 'bella', type: 'custom', title: 'Morning walk', startLocal: '2026-11-19T07:30', hasExplicitTime: true, timezoneId: mockTZ, recurrence: { kind: 'daily' }, notes: null },
    { id: 'flea', petId: 'milo', type: 'flea_tick', title: 'Flea and tick', startLocal: '2026-11-18T00:00', hasExplicitTime: false, timezoneId: mockTZ, recurrence: { kind: 'none' }, notes: null },
    { id: 'vet', petId: 'bella', type: 'vet_visit', title: 'Annual check-up', startLocal: '2026-11-27T10:30', hasExplicitTime: true, timezoneId: mockTZ, recurrence: { kind: 'none' }, notes: null },
  ],
  overrides: [],
  vaccinations: [{ id: 'rabies', petId: 'bella', vaccineName: 'Rabies booster', nextDueOn: '2026-11-22' }],
  petNames: new Map(mockPets.map((p) => [p.id, p.name])),
};

jest.mock('../useAgenda', () => ({
  useAgenda: (from: string, to: string, now: number) => ({
    items: mockBuildAgenda(mockData, { from, to, now, dueSoonDays: 3, timeZone: 'Asia/Karachi' }),
    pets: mockState.pets,
    loaded: true,
    dueSoonDays: 3,
  }),
  toggleAgendaItem: (...a: unknown[]) => mockToggle(...a),
}));

/* eslint-disable @typescript-eslint/no-require-imports */
const Home = () => require('@/app/(tabs)/index').default;
const Calendar = () => require('@/app/(tabs)/calendar').default;
/* eslint-enable @typescript-eslint/no-require-imports */

beforeEach(() => {
  mockPush.mockClear();
  mockToggle.mockClear();
  mockState.pets = mockPets;
});

describe('Home', () => {
  it('shows counts that match the lists below them', async () => {
    const H = Home();
    await render(<H />);
    expect(screen.getByLabelText('2 overdue')).toBeTruthy(); // flea (18th) and today's 7:30 walk
    expect(screen.getByLabelText('4 due soon')).toBeTruthy(); // walks on the 20th to 22nd, and the rabies booster on the 22nd
    expect(screen.getByLabelText('1 today')).toBeTruthy();
    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('Flea and tick')).toBeTruthy();
    expect(screen.getByText('Rabies booster due')).toBeTruthy();
    expect(screen.getByText('NEXT VET VISIT')).toBeTruthy();
    expect(screen.getByText('Annual check-up · Bella')).toBeTruthy();
  });

  it('marks today’s task done from Home', async () => {
    const H = Home();
    await render(<H />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Mark done: Morning walk' }));
    expect(mockToggle).toHaveBeenCalledWith(expect.objectContaining({ refId: 'walk', key: '2026-11-19' }));
  });

  it('welcomes a new owner with no pets', async () => {
    mockState.pets = [];
    const H = Home();
    await render(<H />);
    expect(screen.getByText('Add your first pet')).toBeTruthy();
  });
});

describe('Calendar', () => {
  it('shows the selected day and filters by pet and type', async () => {
    const C = Calendar();
    await render(<C />);
    expect(screen.getByText(/^Today, /)).toBeTruthy();
    expect(screen.getByText('Morning walk')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: /(22 Nov|Nov 22), 2 items/ }));
    expect(screen.getByText('Rabies booster due')).toBeTruthy();
    expect(screen.getByText('Morning walk')).toBeTruthy();

    await fireEvent.press(screen.getByRole('radio', { name: 'Vaccines' }));
    expect(screen.getByText('Rabies booster due')).toBeTruthy();
    expect(screen.queryByText('Morning walk')).toBeNull();

    await fireEvent.press(screen.getByRole('radio', { name: 'Milo' }));
    expect(screen.getByText('Nothing on this day.')).toBeTruthy();
  });

  it('moves between months and back to today', async () => {
    const C = Calendar();
    await render(<C />);
    await fireEvent.press(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('header', { name: /December 2026/ })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Today' }));
    expect(screen.getByRole('header', { name: /November 2026/ })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'All types', checked: true })).toBeTruthy();
  });
});
