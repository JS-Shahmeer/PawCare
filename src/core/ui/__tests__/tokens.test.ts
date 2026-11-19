import { contrastRatio } from '../contrast';
import { palettes, type ColorScheme, type StatusKey } from '../tokens';

const schemes: ColorScheme[] = ['light', 'dark'];
const statuses: StatusKey[] = ['overdue', 'dueSoon', 'upcoming', 'completed'];

describe.each(schemes)('%s palette', (scheme) => {
  const p = palettes[scheme];

  it.each(statuses)('status %s text meets WCAG AA (4.5:1) on its tint', (status) => {
    const { fg, bg } = p.status[status];
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('body and muted text meet 4.5:1 on ground and surface', () => {
    for (const bg of [p.ground, p.surface]) {
      expect(contrastRatio(p.ink, bg)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(p.muted, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('primary button label meets 4.5:1', () => {
    expect(contrastRatio(p.onPrimary, p.primary)).toBeGreaterThanOrEqual(4.5);
  });

  it('primary and accent text meet 4.5:1 on their tints', () => {
    expect(contrastRatio(p.primary, p.primaryTint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.accentText, p.accentTint)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(p.danger, p.dangerTint)).toBeGreaterThanOrEqual(4.5);
  });

  it('add button icon meets 3:1 for graphics', () => {
    expect(contrastRatio(p.onAccent, p.accent)).toBeGreaterThanOrEqual(3);
  });
});
