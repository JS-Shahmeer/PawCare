/** Jest stand-in for the native picker: a text input that reports typed values. */
import { TextInput } from 'react-native';

import type { DateTimeFieldProps } from '@/core/ui/components/DateTimeField';

export function DateTimeField({ label, value, onChange, error }: DateTimeFieldProps) {
  return (
    <>
      <TextInput accessibilityLabel={label} value={value ?? ''} onChangeText={onChange} />
      {error ? <TextInput accessibilityLabel={`${label} error`} value={error} /> : null}
    </>
  );
}
