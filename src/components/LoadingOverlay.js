import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { getColors, borderRadius, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

export default function LoadingOverlay({ visible, title = 'Загрузка' }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const pulse = useRef(new Animated.Value(0.3)).current;
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.3, duration: 600, useNativeDriver: true }),
      ])
    );

    const spinAnimation = Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })
    );

    pulseAnimation.start();
    spinAnimation.start();

    return () => {
      pulseAnimation.stop();
      spinAnimation.stop();
      pulse.setValue(0.3);
      spin.setValue(0);
    };
  }, [visible, pulse, spin]);

  if (!visible) {
    return null;
  }

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]} pointerEvents="auto">
      <Animated.View
        style={[
          styles.loader,
          {
            borderColor: colors.primary,
            borderTopColor: colors.accent,
            opacity: pulse,
            transform: [{ rotate }],
          },
        ]}
      />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: colors.textLight }]}>Подготавливаем лучший сервис</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  loader: {
    width: 72,
    height: 72,
    borderWidth: 6,
    borderRadius: borderRadius.round,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
  },
});
