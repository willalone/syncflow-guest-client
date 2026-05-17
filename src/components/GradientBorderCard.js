import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_LILAC, BRAND_LIME, borderRadius } from '../constants/theme';

const PAD = 1;

/**
 * Акцентная градиентная оправа — для hero и избранных блоков.
 */
export default function GradientBorderCard({ children, style, innerStyle, colors }) {
  const outerR = borderRadius['2xl'] + PAD;
  const innerR = borderRadius['2xl'];

  return (
    <LinearGradient
      colors={[BRAND_LILAC, BRAND_LIME]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ padding: PAD, borderRadius: outerR }, style]}
    >
      <View
        style={[
          styles.inner,
          {
            borderRadius: innerR,
            backgroundColor: colors.card,
          },
          innerStyle,
        ]}
      >
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  inner: {
    overflow: 'hidden',
  },
});
