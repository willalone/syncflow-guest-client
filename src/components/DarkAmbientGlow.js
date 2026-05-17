import React from 'react';
import { StyleSheet, View } from 'react-native';
import { getGlowTokens } from '../constants/theme';

/**
 * Мягкие «ореолы» на фоне тёмной темы — глубина без кислотных неонов.
 */
export default function DarkAmbientGlow() {
  const glow = getGlowTokens(true);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.orb, styles.orbLilacTop, { backgroundColor: glow.lilacSoft }]} />
      <View style={[styles.orb, styles.orbLimeBottom, { backgroundColor: glow.limeSoft }]} />
      <View style={[styles.orb, styles.orbLilacCenter, { backgroundColor: glow.lilacSoft }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbLilacTop: {
    width: 280,
    height: 280,
    top: -90,
    right: -70,
    opacity: 0.95,
  },
  orbLimeBottom: {
    width: 240,
    height: 240,
    bottom: 120,
    left: -80,
    opacity: 0.85,
  },
  orbLilacCenter: {
    width: 180,
    height: 180,
    top: '38%',
    right: -50,
    opacity: 0.5,
  },
});
