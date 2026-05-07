import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../constants/theme';

/**
 * expo-image стабильнее тянет https с CDN (Unsplash) в Expo Go / новых RN, чем Image из react-native.
 */
export default function DishImage({ uri, title, style, borderRadius = 12 }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const trimmed = String(uri || '').trim();
  const [failed, setFailed] = useState(false);

  const fallbackLabel = useMemo(() => {
    const parts = String(title || '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase() || '');
    return parts.join('') || 'SF';
  }, [title]);

  useEffect(() => {
    setFailed(false);
  }, [trimmed]);

  const surface = colors.cardElevated;
  const muted = colors.textMuted;
  const showPlaceholder = !trimmed || failed;

  return (
    <View style={[styles.container, style, { borderRadius, backgroundColor: surface }]}>
      {!showPlaceholder ? (
        <Image
          source={{ uri: trimmed }}
          recyclingKey={trimmed}
          style={[StyleSheet.absoluteFillObject, { borderRadius }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          onError={() => setFailed(true)}
        />
      ) : null}
      {showPlaceholder ? (
        <View
          pointerEvents="none"
          style={[styles.placeholder, { borderRadius, backgroundColor: surface }]}
        >
          <Ionicons name="restaurant-outline" size={22} color={muted} />
          <Text style={[styles.fallbackText, { color: muted }]}>{fallbackLabel}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  placeholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fallbackText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
