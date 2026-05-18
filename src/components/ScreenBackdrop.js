import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getScreenGradient } from '../constants/theme';

/**
 * Мягкий градиент фона без декоративных пятен — глубина за счёт карточек.
 */
export default function ScreenBackdrop({ isDarkMode, children, style }) {
  const g = getScreenGradient(isDarkMode);
  return (
    <View style={[styles.wrap, style]}>
      <LinearGradient colors={g.colors} locations={g.locations} start={g.start} end={g.end} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
});
