import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { usePalette } from '../theme';
import { typography, type TypographyVariant } from '../tokens';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  tone?: 'ink' | 'muted' | 'primary' | 'danger' | 'onPrimary';
}

export function Text({ variant = 'body', tone = 'ink', style, ...rest }: TextProps) {
  const p = usePalette();
  const color = {
    ink: p.ink,
    muted: p.muted,
    primary: p.primary,
    danger: p.danger,
    onPrimary: p.onPrimary,
  }[tone];
  return <RNText style={[typography[variant], { color }, style]} {...rest} />;
}
