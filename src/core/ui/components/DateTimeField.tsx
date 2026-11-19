import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { usePalette } from '../theme';
import { fonts, radius, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

const pad = (n: number) => String(n).padStart(2, '0');

function toDate(mode: 'date' | 'time', value: string | null | undefined): Date {
  if (!value) return new Date();
  if (mode === 'date') {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const [h, min] = value.split(':').map(Number);
  const t = new Date();
  t.setHours(h, min, 0, 0);
  return t;
}

function fromDate(mode: 'date' | 'time', d: Date): string {
  return mode === 'date' ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export interface DateTimeFieldProps {
  label: string;
  mode: 'date' | 'time';
  /** 'YYYY-MM-DD' for dates, 'HH:mm' for times. */
  value: string | null | undefined;
  onChange: (value: string) => void;
  /** Shown when there is no value yet. */
  placeholder?: string;
  /** How to show the value, e.g. "Fri 20 Nov". */
  format?: (value: string) => string;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
  optional?: boolean;
}

/** Native date or time picker: a dialog on Android, the compact inline picker on iOS. */
export function DateTimeField({ label, mode, value, onChange, placeholder, format, minimumDate, maximumDate, error, optional }: DateTimeFieldProps) {
  const p = usePalette();
  const handle = (_e: DateTimePickerEvent, d?: Date) => {
    if (d && _e.type === 'set') onChange(fromDate(mode, d));
  };

  return (
    <View style={styles.root}>
      <Text variant="label">
        {label}
        {optional ? <Text variant="label" tone="muted">{'  Optional'}</Text> : null}
      </Text>
      {Platform.OS === 'ios' ? (
        <View style={[styles.box, { backgroundColor: p.surface, borderColor: error ? p.danger : p.border }]}>
          <DateTimePicker
            value={toDate(mode, value)}
            mode={mode}
            display="compact"
            onChange={handle}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            accentColor={p.primary}
            accessibilityLabel={label}
          />
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ? (format ? format(value) : value) : placeholder ?? 'not set'}`}
          onPress={() =>
            DateTimePickerAndroid.open({ value: toDate(mode, value), mode, onChange: handle, minimumDate, maximumDate, is24Hour: false })
          }
          style={[styles.box, styles.pressable, { backgroundColor: p.surface, borderColor: error ? p.danger : p.border }]}
        >
          <Text style={{ fontFamily: fonts.body, fontSize: 16, color: value ? p.ink : p.muted }}>
            {value ? (format ? format(value) : value) : placeholder ?? (mode === 'date' ? 'Choose a date' : 'Choose a time')}
          </Text>
        </Pressable>
      )}
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  box: {
    minHeight: touchTarget + 4,
    borderWidth: 1.5,
    borderRadius: radius.field,
    paddingHorizontal: spacing.md + 2,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  pressable: {},
});
