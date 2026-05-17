import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, fontFamily, getGlassTokens, getShadows, spacing } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

const TRACK_W = 52;
const THUMB = 26;

export default function ThemeToggle({ colors }) {
  const { isDarkMode, setThemeMode } = useTheme();
  const glass = getGlassTokens(isDarkMode);
  const shadows = getShadows(isDarkMode);
  const slide = useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(slide, {
      toValue: isDarkMode ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 120,
    }).start();
  }, [isDarkMode, slide]);

  const thumbX = slide.interpolate({
    inputRange: [0, 1],
    outputRange: [2, TRACK_W - THUMB - 2],
  });

  return (
    <View style={styles.wrap}>
      <Ionicons name="sunny-outline" size={16} color={isDarkMode ? colors.textMuted : colors.primaryDark} />
      <Pressable
        onPress={() => setThemeMode(!isDarkMode)}
        accessibilityRole="switch"
        accessibilityState={{ checked: isDarkMode }}
        style={[
          styles.track,
          isDarkMode ? shadows.glowSoft : null,
          {
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.1)' : glass.fill,
            borderColor: isDarkMode ? glass.border : glass.border,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.thumb,
            isDarkMode ? shadows.glowLime : null,
            {
              backgroundColor: isDarkMode ? colors.primary : colors.white,
              transform: [{ translateX: thumbX }],
            },
          ]}
        />
      </Pressable>
      <Ionicons name="moon-outline" size={16} color={isDarkMode ? colors.primary : colors.textMuted} />
      <Text style={[styles.label, { color: colors.textMuted }]}>{isDarkMode ? 'Тёмная' : 'Светлая'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  track: {
    width: TRACK_W,
    height: 30,
    borderRadius: borderRadius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontFamily: fontFamily.sansMedium,
    fontSize: 12,
    marginLeft: 2,
  },
});
