import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { usePalette } from '../theme';
import { fonts, radius, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export interface TextFieldProps extends TextInputProps {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
}

export function TextField({ label, error, hint, optional, multiline, style, ...rest }: TextFieldProps) {
  const p = usePalette();
  return (
    <View style={styles.root}>
      <Text variant="label">
        {label}
        {optional ? <Text variant="label" tone="muted">{'  Optional'}</Text> : null}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={p.muted}
        multiline={multiline}
        style={[
          styles.input,
          multiline && styles.multiline,
          { backgroundColor: p.surface, color: p.ink, borderColor: error ? p.danger : p.border },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" tone="danger" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  input: {
    minHeight: touchTarget + 4,
    borderWidth: 1.5,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md + 2,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
});
