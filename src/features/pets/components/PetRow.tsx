import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Pet } from '@/core/db/schema';
import { resolveStoredUri } from '@/core/files/storage';
import { Avatar, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';

import { petSubtitle } from '../logic/describePet';

export function PetRow({ pet }: { pet: Pet }) {
  const p = usePalette();
  const subtitle = petSubtitle(pet);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pet.name}, ${subtitle}`}
      onPress={() => router.push({ pathname: '/pet/[id]', params: { id: pet.id } })}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? p.surfaceMuted : p.surface, borderColor: p.border },
      ]}
    >
      <Avatar uri={pet.photoPath ? resolveStoredUri(pet.photoPath) : null} label={pet.name} size={52} tone={pet.species === 'cat' ? 'teal' : 'coral'} />
      <View style={styles.text}>
        <Text variant="heading" numberOfLines={1}>
          {pet.name}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ fontSize: 13 }}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  text: { flex: 1, gap: 2 },
});
