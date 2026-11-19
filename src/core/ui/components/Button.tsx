import { ActivityIndicator, Pressable, type PressableProps, StyleSheet } from 'react-native';

import { usePalette } from '../theme';
import { radius, spacing, touchTarget, typography } from '../tokens';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
}

export function Button({ label, variant = 'primary', loading = false, disabled, style, ...rest }: ButtonProps) {
  const p = usePalette();
  const isDisabled = disabled || loading;

  const colors = {
    primary: { bg: p.primary, pressed: p.primaryPressed, fg: p.onPrimary, border: 'transparent' },
    secondary: { bg: p.surface, pressed: p.primaryTint, fg: p.primary, border: p.primary },
    ghost: { bg: 'transparent', pressed: p.primaryTint, fg: p.primary, border: 'transparent' },
    destructive: { bg: p.dangerTint, pressed: p.dangerTint, fg: p.danger, border: 'transparent' },
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={(state) => [
        styles.base,
        {
          backgroundColor: state.pressed ? colors.pressed : colors.bg,
          borderColor: colors.border,
          opacity: isDisabled ? 0.5 : 1,
        },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors.fg} />
      ) : (
        <Text style={[typography.heading, { color: colors.fg, fontSize: 15 }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget + 4,
    paddingHorizontal: spacing.xl - 2,
    borderRadius: radius.field + 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
