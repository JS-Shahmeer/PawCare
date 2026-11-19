import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { usePalette } from '../theme';
import { fonts } from '../tokens';
import { Text } from './Text';

export interface AvatarProps {
  /** file:// URI of a photo, if any. */
  uri?: string | null;
  label: string;
  size?: number;
  tone?: 'coral' | 'teal';
}

/** Rounded-square pet avatar: the photo, or the name's initial when there is none. */
export function Avatar({ uri, label, size = 48, tone = 'coral' }: AvatarProps) {
  const p = usePalette();
  const r = Math.round(size * 0.3);
  const bg = tone === 'coral' ? p.accentTint : p.primaryTint;
  const fg = tone === 'coral' ? p.accentText : p.primary;
  return (
    <View
      style={[styles.box, { width: size, height: size, borderRadius: r, backgroundColor: bg }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r }} contentFit="cover" />
      ) : (
        <Text style={{ fontFamily: fonts.displayExtraBold, fontSize: size * 0.4, color: fg }}>
          {label.trim().charAt(0).toUpperCase() || '?'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
