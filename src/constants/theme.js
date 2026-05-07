/** Лёгкая премиальная система: бренд #E2C6FB + #C4E35A, без тяжёлых контуров. */

import { Platform } from 'react-native';

export const BRAND_LILAC = '#E2C6FB';
export const BRAND_LIME = '#C4E35A';

/** Всё на DM Sans — кириллица, латиница и цифры выглядят едино (Syne почти без кириллицы). */
export const fontFamily = {
  sans: 'DMSans_400Regular',
  sansMedium: 'DMSans_500Medium',
  sansSemibold: 'DMSans_600SemiBold',
  sansBold: 'DMSans_700Bold',
};

export const getColors = (isDarkMode = false) => ({
  primary: isDarkMode ? '#DDEA7A' : BRAND_LIME,
  primaryDark: isDarkMode ? '#C5D85C' : '#9AB832',
  accent: isDarkMode ? '#DEC4F5' : BRAND_LILAC,
  success: isDarkMode ? '#8FD4A4' : '#6BB87E',
  warning: isDarkMode ? '#E8D4A0' : '#D4B87A',
  error: isDarkMode ? '#F0A0A8' : '#D86A72',
  info: isDarkMode ? '#B8A8E0' : '#9588C8',

  background: isDarkMode ? '#1E1A24' : '#FAF7FC',
  backgroundLight: isDarkMode ? '#28232F' : '#FFFFFF',
  card: isDarkMode ? '#302A38' : '#FFFFFF',
  cardElevated: isDarkMode ? '#383244' : '#F5F0FA',
  overlay: isDarkMode ? 'rgba(12, 10, 16, 0.88)' : 'rgba(250, 247, 252, 0.92)',

  text: isDarkMode ? '#F5F0FA' : '#2A2434',
  textLight: isDarkMode ? '#D8CFE8' : '#5A5268',
  textMuted: isDarkMode ? '#B0A4C4' : '#7A7288',
  border: isDarkMode ? 'rgba(232, 220, 255, 0.12)' : 'rgba(42, 28, 58, 0.08)',

  /** Тонкая линия вместо «чернил» — не перегружает интерфейс. */
  hairline: isDarkMode ? 'rgba(236, 228, 255, 0.16)' : 'rgba(44, 28, 58, 0.1)',
  /** Совместимость: то же, что hairline (старый ключ ink). */
  ink: isDarkMode ? 'rgba(236, 228, 255, 0.16)' : 'rgba(44, 28, 58, 0.1)',

  white: '#FFFFFF',
  black: isDarkMode ? '#141018' : '#1E1824',
});

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 26,
  round: 50,
  cardTL: 20,
  cardTR: 12,
  cardBR: 18,
  cardBL: 12,
};

export const typography = {
  h1: {
    fontSize: 34,
    lineHeight: 40,
    fontFamily: fontFamily.sansBold,
    letterSpacing: -0.6,
  },
  h2: {
    fontSize: 28,
    lineHeight: 34,
    fontFamily: fontFamily.sansBold,
    letterSpacing: -0.45,
  },
  h3: {
    fontSize: 21,
    lineHeight: 28,
    fontFamily: fontFamily.sansSemibold,
    letterSpacing: -0.15,
  },
  h4: {
    fontSize: 18,
    lineHeight: 24,
    fontFamily: fontFamily.sansSemibold,
    letterSpacing: -0.08,
  },
  body: {
    fontSize: 15,
    lineHeight: 21,
    fontFamily: fontFamily.sans,
  },
  bodyLarge: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: fontFamily.sans,
  },
  /** Цены и числа — один вес + табличные цифры где поддерживается ОС. */
  numeric: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fontFamily.sansBold,
    fontVariant: ['tabular-nums'],
    ...Platform.select({
      android: { fontFeatureSettings: '"tnum"' },
      default: {},
    }),
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: fontFamily.sansMedium,
    letterSpacing: 0.35,
  },
  button: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamily.sansBold,
    letterSpacing: 0.35,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: fontFamily.sansBold,
    letterSpacing: 1.5,
  },
};

/** Мягкие тени; float — «воздух» под карточками без жёсткого стикера. */
export const getShadows = (isDarkMode = false) => {
  const tint = isDarkMode ? '#1A1028' : '#6B5080';
  return {
    small: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDarkMode ? 0.35 : 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
    medium: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDarkMode ? 0.4 : 0.08,
      shadowRadius: 14,
      elevation: 4,
    },
    large: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDarkMode ? 0.45 : 0.1,
      shadowRadius: 22,
      elevation: 8,
    },
    float: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDarkMode ? 0.38 : 0.07,
      shadowRadius: 16,
      elevation: 6,
    },
    sticker: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.32 : 0.06,
      shadowRadius: 10,
      elevation: 4,
    },
  };
};

export const shadows = getShadows(false);

/** Градиент подложки экрана: лёгкий сдвиг тона, не «обои». */
export const getScreenGradient = (isDarkMode = false) =>
  isDarkMode
    ? {
        colors: ['#151218', '#221B2C', '#1A1620'],
        locations: [0, 0.5, 1],
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
      }
    : {
        colors: ['#FFFEFF', '#EFE6F7', '#F8F4FB'],
        locations: [0, 0.42, 1],
        start: { x: 0, y: 0 },
        end: { x: 0.85, y: 1 },
      };
