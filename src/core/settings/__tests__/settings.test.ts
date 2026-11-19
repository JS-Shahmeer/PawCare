/**
 * @jest-environment node
 */
import { createTestDb } from '@/test/testDb';

let mockDb: ReturnType<typeof createTestDb>['db'];
jest.mock('@/core/db/client', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

// eslint-disable-next-line import/first
import { DEFAULT_SETTINGS, getSettings, parseSettings, setSetting } from '../settings';

beforeEach(() => {
  ({ db: mockDb } = createTestDb());
});

describe('settings', () => {
  it('uses defaults when nothing is stored', () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('stores and overwrites values', () => {
    setSetting('dueSoonDays', 7);
    setSetting('defaultAlert', '60');
    setSetting('dueSoonDays', 1);
    expect(getSettings()).toEqual({ dueSoonDays: 1, defaultAlert: '60' });
  });

  it('rejects values outside the allowed choices', () => {
    expect(() => setSetting('dueSoonDays', 5 as never)).toThrow();
    expect(() => setSetting('defaultAlert', 'soon' as never)).toThrow();
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('falls back to defaults for corrupt stored rows', () => {
    expect(parseSettings([{ key: 'dueSoonDays', value: 'abc' }, { key: 'defaultAlert', value: '999' }, { key: 'other', value: 'x' }])).toEqual(DEFAULT_SETTINGS);
  });
});
