import { useColorScheme } from 'react-native';

import { palettes, type ColorScheme, type Palette } from './tokens';

export function useScheme(): ColorScheme {
  return useColorScheme() === 'dark' ? 'dark' : 'light';
}

export function usePalette(): Palette {
  return palettes[useScheme()];
}
