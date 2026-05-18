import React from 'react';
import GlassCard from './GlassCard';
import { borderRadius, layout } from '../../constants/theme';

/** Карточка интерфейса — стеклянный стиль (делегирует GlassCard). */
export default function SurfaceCard({
  children,
  style,
  innerStyle,
  colors: _colors,
  shadows,
  padding = layout.cardPadding,
  radius = borderRadius.xl,
  elevated = true,
  shadowVariant = 'cardFloat',
  mode = 'frosted',
}) {
  return (
    <GlassCard
      style={style}
      innerStyle={innerStyle}
      padding={padding}
      radius={radius}
      elevated={elevated}
      shadows={shadows}
      shadowVariant={shadowVariant}
      mode={mode}
    >
      {children}
    </GlassCard>
  );
}
