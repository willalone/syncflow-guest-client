import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getCardDropShadowNativeStyle, getCardDropShadowSpec } from '../../constants/theme';

/**
 * Мягкая тень вниз-влево (свет сверху справа) — слои-подложки + лёгкий native на iOS.
 * Native shadowOffset на части устройств визуально уходит вправо; геометрию задаём слоями.
 */
export default function CardDropShadow({ children, radius, style, backgroundColor }) {
  const { isDarkMode } = useTheme();
  const spec = useMemo(() => getCardDropShadowSpec(isDarkMode), [isDarkMode]);
  const native = useMemo(() => getCardDropShadowNativeStyle(isDarkMode), [isDarkMode]);

  const hostPad = useMemo(
    () => ({
      paddingLeft: Math.abs(spec.offsetX) + spec.spread + 10,
      paddingBottom: spec.offsetY + spec.spread + 10,
      paddingRight: 8,
    }),
    [spec]
  );

  /** Три слоя = рассеянный blur (аналог Figma blur 250). */
  const shadowLayers = useMemo(() => {
    const base = spec.opacity;
    return [
      { dx: 0, dy: 0, spread: spec.spread + 6, alpha: base * 0.22 },
      { dx: -2, dy: 3, spread: spec.spread + 3, alpha: base * 0.32 },
      { dx: -4, dy: 6, spread: spec.spread, alpha: base * 0.48 },
    ];
  }, [spec]);

  return (
    <View style={[styles.host, hostPad, style]}>
      {shadowLayers.map((layer, index) => (
        <View
          key={String(index)}
          pointerEvents="none"
          style={[
            styles.plate,
            {
              borderRadius: radius + layer.spread,
              backgroundColor: `rgba(0, 0, 0, ${layer.alpha})`,
              top: spec.offsetY + layer.dy,
              left: spec.offsetX + layer.dx - layer.spread,
              right: spec.insetRight + layer.spread * 0.5,
              bottom: -layer.spread * 0.4,
            },
          ]}
        />
      ))}
      <View style={[styles.card, native, { borderRadius: radius, backgroundColor }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    overflow: 'visible',
  },
  plate: {
    position: 'absolute',
  },
  card: {
    overflow: 'hidden',
    zIndex: 2,
  },
});
