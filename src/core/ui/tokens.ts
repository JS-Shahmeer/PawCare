/**
 * PawCare design tokens. Source of truth for color, type, spacing and radius.
 * Mirrors the approved design system canvas (teal primary, coral accent, warm off-white ground).
 */

export type ColorScheme = 'light' | 'dark';

export type StatusKey = 'overdue' | 'dueSoon' | 'upcoming' | 'completed';

export interface Palette {
  ground: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  ink: string;
  muted: string;
  primary: string;
  primaryPressed: string;
  primaryTint: string;
  onPrimary: string;
  accent: string;
  accentText: string;
  accentTint: string;
  onAccent: string;
  danger: string;
  dangerTint: string;
  status: Record<StatusKey, { fg: string; bg: string }>;
}

export const palettes: Record<ColorScheme, Palette> = {
  light: {
    ground: '#F7F5F2',
    surface: '#FFFFFF',
    surfaceMuted: '#EDEAE5',
    border: '#E6E2DC',
    ink: '#1B2B2A',
    muted: '#5B6B69',
    primary: '#0F766E',
    primaryPressed: '#0B5A54',
    primaryTint: '#E3F3F0',
    onPrimary: '#FFFFFF',
    accent: '#F26B4F',
    accentText: '#B4432B',
    accentTint: '#FDECE7',
    onAccent: '#FFFFFF',
    danger: '#B42318',
    dangerTint: '#FDECEA',
    status: {
      overdue: { fg: '#B42318', bg: '#FDECEA' },
      dueSoon: { fg: '#A14A06', bg: '#FEF3E2' },
      upcoming: { fg: '#1D4ED8', bg: '#EAF2FE' },
      completed: { fg: '#067647', bg: '#E6F5EC' },
    },
  },
  dark: {
    ground: '#111716',
    surface: '#1A2221',
    surfaceMuted: '#232D2C',
    border: '#2A3433',
    ink: '#EEF3F2',
    muted: '#A3B1AF',
    primary: '#2BB3A3',
    primaryPressed: '#239485',
    primaryTint: '#16302D',
    onPrimary: '#0B1A19',
    accent: '#F58A72',
    accentText: '#F8A593',
    accentTint: '#3A221C',
    onAccent: '#1F0F0B',
    danger: '#F97066',
    dangerTint: '#3A1A17',
    status: {
      overdue: { fg: '#F97066', bg: '#3A1A17' },
      dueSoon: { fg: '#FDB022', bg: '#3A2A10' },
      upcoming: { fg: '#84ADFF', bg: '#172442' },
      completed: { fg: '#47CD89', bg: '#12301F' },
    },
  },
};

export const fonts = {
  displayExtraBold: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
} as const;

export const typography = {
  display: { fontFamily: fonts.displayExtraBold, fontSize: 28, lineHeight: 34 },
  title: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26 },
  heading: { fontFamily: fonts.bodySemiBold, fontSize: 16, lineHeight: 22 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16 },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const radius = { field: 12, card: 16, sheet: 24, pill: 999 } as const;

/** Minimum touch target size in dp. */
export const touchTarget = 44;

export const statusLabels: Record<StatusKey, string> = {
  overdue: 'Overdue',
  dueSoon: 'Due soon',
  upcoming: 'Upcoming',
  completed: 'Completed',
};
