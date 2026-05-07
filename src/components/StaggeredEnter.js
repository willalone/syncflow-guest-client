import React from 'react';
import { View } from 'react-native';

/**
 * Раньше здесь была анимация opacity с 0 → 1; на части устройств она не доходила до 1,
 * из‑за чего карточки меню (включая фото) оставались полностью невидимыми.
 */
export default function StaggeredEnter({ children, style }) {
  return <View style={style}>{children}</View>;
}
