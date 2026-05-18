import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { borderRadius, getColors, getGlassTokens, layout } from '../../constants/theme';
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
  shadowVariant = 'cardFloat',
}) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const glass = getGlassTokens(isDarkMode);
  const elevationShadow =
    elevated && shadows ? shadows[shadowVariant] || shadows.cardFloat || shadows.float : null;

  const shellStyle = [styles.shell, { borderRadius: radius, borderColor: glass.border }, style];

  const wrapElevated = (node) => {
    if (!elevationShadow) return node;
    return (
      <View
        style={[
          styles.shadowWrap,
          elevationShadow,
          { borderRadius: radius, backgroundColor: colors.card },
        ]}
      >
        {node}
      </View>
    );
  };

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
    return wrapElevated(
      <View style={shellStyle}>
        <BlurView
          intensity={glass.blurIntensity}
          tint={glass.blurTint}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
        />
        {tintLayer}
        {content}
      </View>
    );
  }

  return wrapElevated(
    <View style={[shellStyle, { backgroundColor: glass.fill, overflow: 'hidden' }]}>
      <View
        pointerEvents="none"
        style={[styles.topHighlight, { borderTopLeftRadius: radius, borderTopRightRadius: radius, backgroundColor: glass.borderSoft }]}
      />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  shadowWrap: {
    overflow: 'visible',
  },
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
});
