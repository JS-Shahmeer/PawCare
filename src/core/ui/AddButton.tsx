import { router } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from './components';
import { usePalette } from './theme';

/** Floating button that opens the global Add sheet. */
export function AddButton() {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add"
      onPress={() => router.push('/add')}
      style={({ pressed }) => [styles.fab, { backgroundColor: p.accent, opacity: pressed ? 0.85 : 1 }]}
    >
      <Icon name="plus" size={26} color={p.onAccent} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#F26B4F',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
  },
});
