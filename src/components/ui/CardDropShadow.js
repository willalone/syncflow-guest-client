import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getCardDropShadowNativeStyle, getCardDropShadowSpec } from '../../constants/theme';

/**
 * Карточка «парит»: мягкая заметная тень вниз-влево (как объём у accent-кнопок, без неона).
 * Тень на оболочке с overflow: visible — иначе iOS обрезает shadow у внутреннего слоя.
 */
export default function CardDropShadow({ children, radius, style, backgroundColor }) {
  const { isDarkMode } = useTheme();
  const spec = useMemo(() => getCardDropShadowSpec(isDarkMode), [isDarkMode]);
  const native = useMemo(() => getCardDropShadowNativeStyle(isDarkMode), [isDarkMode]);

  const shadowLayers = useMemo(() => {
    const base = spec.opacity;
    return [
      { dx: 0, dy: 0, spread: spec.spread + 4, alpha: base * 0.55 },
      { dx: -3, dy: 3, spread: spec.spread, alpha: base * 0.9 },
      { dx: -1, dy: 6, spread: spec.spread - 1, alpha: base * 0.35 },
    ];
  }, [spec]);

  /** Только снизу — горизонталь не сужаем: ширина как у поисковой строки в том же padding контейнера. */
  const hostPad = useMemo(
    () => ({ paddingBottom: spec.offsetY + spec.spread + 4 }),
    [spec]
  );

  return (
    <View style={[styles.host, hostPad, style]}>
      {Platform.OS === 'android'
        ? shadowLayers.map((layer, index) => (
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
                  right: spec.insetRight + layer.spread * 0.35,
                  bottom: -layer.spread * 0.3,
                },
              ]}
            />
          ))
        : null}
      <View
        style={[
          styles.shadowWrap,
          native,
          { borderRadius: radius, backgroundColor },
        ]}
      >
        <View style={[styles.card, { borderRadius: radius }]}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    width: '100%',
    alignSelf: 'stretch',
    overflow: 'visible',
  },
  plate: {
    position: 'absolute',
  },
  shadowWrap: {
    width: '100%',
    overflow: 'visible',
    zIndex: 1,
  },
  card: {
    overflow: 'hidden',
  },
});
