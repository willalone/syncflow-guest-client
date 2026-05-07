import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function AppToast({ visible, type = 'success', message = '' }) {
  const { isDarkMode } = useTheme();
  const slide = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const palette = useMemo(() => {
    if (isDarkMode) {
      return type === 'success'
        ? { bg: '#2A3530', border: '#5A8A72', text: '#C8E4D4', icon: '#9DC9B0' }
        : { bg: '#3A2F32', border: '#8A6068', text: '#F0D4D8', icon: '#D8A8A8' };
    }
    return type === 'success'
      ? { bg: '#E4F0EA', border: '#A8C9B8', text: '#3D5C4A', icon: '#5A9078' }
      : { bg: '#F5E8E8', border: '#D8B0B0', text: '#6B4548', icon: '#B87878' };
  }, [isDarkMode, type]);

  const iconName = type === 'success' ? 'checkmark-circle' : 'close-circle';

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: visible ? 0 : -80,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slide, opacity]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        {
          opacity,
          transform: [{ translateY: slide }],
        },
      ]}
    >
      <View style={[styles.card, { backgroundColor: palette.bg, borderColor: palette.border }]}>
        <Ionicons name={iconName} size={20} color={palette.icon} />
        <Text style={[styles.text, { color: palette.text }]} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 999,
  },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    ...typography.body,
    fontWeight: '600',
    flex: 1,
  },
});
