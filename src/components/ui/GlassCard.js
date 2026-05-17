import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius, getGlassTokens, getGlowTokens, layout } from '../../constants/theme';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Стеклянная карточка: blur + полупрозрачная заливка + светлая кромка.
 * @param {'blur'|'frosted'} mode — blur для крупных блоков, frosted для списков (легче для GPU).
 */
export default function GlassCard({
  children,
  style,
  innerStyle,
  radius = borderRadius['2xl'],
  padding = layout.cardPadding,
  mode = 'frosted',
  shadows,
  elevated = true,
}) {
  const { isDarkMode } = useTheme();
  const glass = getGlassTokens(isDarkMode);
  const glow = getGlowTokens(isDarkMode);

  const shellStyle = [
    styles.shell,
    elevated && shadows ? shadows.glass : null,
    elevated && isDarkMode && shadows ? shadows.glowSoft : null,
    {
      borderRadius: radius,
      borderColor: glass.border,
      ...(glow.enabled ? { borderWidth: StyleSheet.hairlineWidth * 2 } : null),
    },
    style,
  ];

  const tintLayer = (
    <View
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: mode === 'blur' ? glass.fillStrong : glass.fill,
          borderRadius: radius,
        },
      ]}
    />
  );

  const content = (
    <View style={[styles.content, padding != null ? { padding } : null, innerStyle]}>{children}</View>
  );

  if (mode === 'blur') {
    return (
      <View style={shellStyle}>
        <BlurView
          intensity={glass.blurIntensity}
          tint={glass.blurTint}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
        />
        {tintLayer}
        {glow.enabled ? (
          <View
            pointerEvents="none"
            style={[
              styles.rimGlow,
              {
                borderTopLeftRadius: radius,
                borderTopRightRadius: radius,
                borderColor: glow.rim,
              },
            ]}
          />
        ) : null}
        {content}
      </View>
    );
  }

  return (
    <View style={[shellStyle, { backgroundColor: glass.fill, overflow: 'hidden' }]}>
      <View
        pointerEvents="none"
        style={[styles.topHighlight, { borderTopLeftRadius: radius, borderTopRightRadius: radius, backgroundColor: glass.borderSoft }]}
      />
      {glow.enabled ? (
        <View
          pointerEvents="none"
          style={[
            styles.rimGlow,
            {
              borderTopLeftRadius: radius,
              borderTopRightRadius: radius,
              borderColor: glow.rim,
            },
          ]}
        />
      ) : null}
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  rimGlow: {
    position: 'absolute',
    top: 0,
    left: 12,
    right: 12,
    height: StyleSheet.hairlineWidth * 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
