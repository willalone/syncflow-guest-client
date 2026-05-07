import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_LILAC, BRAND_LIME, fontFamily, getColors, spacing, typography } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Верхний бренд-акцент: градиент + шиммер. Без лишних декоративных точек.
 */
export default function BrandHeaderAccent({ kicker, style }) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 4200,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const sheenX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 420],
  });

  return (
    <View style={[styles.wrap, style]}>
      <View style={[styles.barClip, { backgroundColor: colors.border }]}>
        <LinearGradient
          colors={[BRAND_LILAC, BRAND_LIME, BRAND_LILAC]}
          locations={[0, 0.52, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View style={[styles.sheen, { transform: [{ translateX: sheenX }] }]}>
          <LinearGradient
            colors={['transparent', 'rgba(255,255,255,0.42)', 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.sheenGrad}
          />
        </Animated.View>
      </View>
      {Boolean(kicker) && (
        <Text style={[styles.kicker, typography.kicker, { color: colors.textMuted }]}>{kicker}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
    minHeight: 32,
  },
  barClip: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  sheen: {
    ...StyleSheet.absoluteFillObject,
    width: 100,
  },
  sheenGrad: {
    flex: 1,
    width: 100,
  },
  kicker: {
    marginBottom: 2,
    fontFamily: fontFamily.sansBold,
  },
});
