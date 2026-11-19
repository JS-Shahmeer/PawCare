import { fireEvent, render, screen } from '@testing-library/react-native';

import type { CareEvent, OccurrenceOverride } from '@/core/db/schema';
import { toInstant } from '@/core/time/localDateTime';

import { CareEventRow } from '../components/CareEventRow';

const TZ = 'Asia/Karachi';
const NOW = toInstant('2026-11-19T12:00', TZ);

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...a: unknown[]) => mockPush(...a), back: jest.fn(), replace: jest.fn() },
  useLocalSearchParams: () => ({ id: 'e1' }),
  Stack: { Screen: () => null },
}));

const mockRepo = {
  event: undefined as CareEvent | undefined,
  overrides: [] as OccurrenceOverride[],
  complete: jest.fn().mockResolvedValue(undefined),
  undo: jest.fn().mockResolvedValue(undefined),
};
jest.mock('../repo', () => ({
  useCareEvent: () => ({ event: mockRepo.event, petName: 'Bella', overrides: mockRepo.overrides, loaded: true }),
  completeOccurrence: (...a: unknown[]) => mockRepo.complete(...a),
  undoCompleteOccurrence: (...a: unknown[]) => mockRepo.undo(...a),
  deleteCareEvent: jest.fn(),
  deleteCareFuture: jest.fn(),
  skipOccurrence: jest.fn(),
}));

function event(over: Partial<CareEvent> = {}): CareEvent {
  return {
    id: 'e1',
    petId: 'p1',
    type: 'medication',
    title: 'Heartworm pill',
    startLocal: '2026-11-17T18:00',
    hasExplicitTime: true,
    timezoneId: TZ,
    recurrence: { kind: 'daily' },
    alertLeadMin: 0,
    notes: null,
    cancelled: false,
    createdAt: 0,
    updatedAt: 0,
    ...over,
  } as CareEvent;
}

beforeEach(() => {
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockPush.mockClear();
  mockRepo.complete.mockClear();
  mockRepo.undo.mockClear();
  mockRepo.overrides = [];
});
afterEach(() => jest.restoreAllMocks());

describe('CareEventRow', () => {
  it('keeps missed occurrences visible with an overdue status', async () => {
    await render(<CareEventRow event={event()} overrides={[]} now={NOW} />);
    expect(screen.getByText('Overdue')).toBeTruthy();
    expect(screen.getByText(/2 missed/)).toBeTruthy();
  });

  it('shows the next occurrence once the missed ones are done and opens the detail on press', async () => {
    const done = (key: string) => ({ id: key, eventId: 'e1', occurrenceKey: key, state: 'completed' as const, completedAt: NOW, revisedAt: null });
    await render(<CareEventRow event={event()} overrides={[done('2026-11-17'), done('2026-11-18')]} now={NOW} />);
    expect(screen.queryByText('Overdue')).toBeNull();
    expect(screen.getByText('Due soon')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button'));
    expect(mockPush).toHaveBeenCalledWith({ pathname: '/care/[id]', params: { id: 'e1' } });
  });
});

describe('Care detail screen', () => {
  // Imported lazily so the mocks above apply.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Screen = () => require('@/app/care/[id]/index').default;

  it('lists missed and upcoming occurrences and marks one done', async () => {
    mockRepo.event = event();
    const Detail = Screen();
    await render(<Detail />);

    expect(screen.getByText('Missed')).toBeTruthy();
    expect(screen.getByText('Coming up')).toBeTruthy();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.length).toBe(2 + 5);
    await fireEvent.press(boxes[0]);
    // Newest missed occurrence first.
    expect(mockRepo.complete).toHaveBeenCalledWith('e1', '2026-11-18');
  });

  it('lets the owner undo a completed occurrence', async () => {
    mockRepo.event = event();
    mockRepo.overrides = [{ id: 'o1', eventId: 'e1', occurrenceKey: '2026-11-18', state: 'completed', completedAt: NOW, revisedAt: null }];
    const Detail = Screen();
    await render(<Detail />);
    expect(screen.getByText('Done recently')).toBeTruthy();
    await fireEvent.press(screen.getByRole('checkbox', { name: /Undo done/ }));
    expect(mockRepo.undo).toHaveBeenCalledWith('e1', '2026-11-18');
  });

  it('shows a friendly message when the reminder no longer exists', async () => {
    mockRepo.event = undefined;
    const Detail = Screen();
    await render(<Detail />);
    expect(screen.getByText('Reminder not found')).toBeTruthy();
  });
});
