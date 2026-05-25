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

  background: isDarkMode ? '#121018' : '#FAF7FC',
  backgroundLight: isDarkMode ? '#1E1A26' : '#FFFFFF',
  card: isDarkMode ? '#2A2434' : '#FFFFFF',
  cardElevated: isDarkMode ? '#322C3E' : '#F5F0FA',
  overlay: isDarkMode ? 'rgba(8, 6, 12, 0.9)' : 'rgba(250, 247, 252, 0.92)',

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

/** Токены «стекла» для карточек и панелей (без грязных градиентов). */
export const getGlassTokens = (isDarkMode = false) => ({
  blurTint: isDarkMode ? 'dark' : 'light',
  blurIntensity: isDarkMode ? 38 : 52,
  fill: isDarkMode ? 'rgba(42, 36, 54, 0.62)' : 'rgba(255, 255, 255, 0.58)',
  fillStrong: isDarkMode ? 'rgba(48, 42, 62, 0.78)' : 'rgba(255, 255, 255, 0.78)',
  border: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.75)',
  borderSoft: isDarkMode ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.45)',
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
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
  '2xl': 32,
  sheet: 36,
  round: 50,
  pill: 999,
  cardTL: 24,
  cardTR: 24,
  cardBR: 24,
  cardBL: 24,
};

/** Единые отступы карточек и высота pill-контролов (референсы food/coffee UI). */
export const layout = {
  cardPadding: 16,
  screenPaddingX: 20,
  chipHeight: 44,
  searchHeight: 52,
  fabSize: 44,
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

/**
 * «Парящие» карточки меню: лёгкая, но читаемая тень вниз-влево.
 * По силе ближе к accentGlow, но без цветного свечения — только объём.
 */
export const getCardDropShadowSpec = (isDarkMode = false) => ({
  offsetX: -6,
  offsetY: 10,
  blur: 22,
  spread: 3,
  insetRight: 14,
  opacity: isDarkMode ? 0.3 : 0.22,
  color: isDarkMode ? '#000000' : '#4A3A58',
});

/** iOS — основной слой; Android дополняется подложками в CardDropShadow. */
export const getCardDropShadowNativeStyle = (isDarkMode = false) => {
  const spec = getCardDropShadowSpec(isDarkMode);
  if (Platform.OS !== 'ios') {
    return {};
  }
  return {
    shadowColor: spec.color,
    shadowOffset: { width: spec.offsetX, height: spec.offsetY },
    shadowOpacity: spec.opacity,
    shadowRadius: spec.blur,
  };
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
      shadowOpacity: isDarkMode ? 0.32 : 0.07,
      shadowRadius: 16,
      elevation: 6,
    },
    cardFloat: getCardDropShadowNativeStyle(isDarkMode),
    sticker: {
      shadowColor: tint,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.32 : 0.06,
      shadowRadius: 10,
      elevation: 4,
    },
    glass: {
      shadowColor: isDarkMode ? '#000000' : '#5A4868',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: isDarkMode ? 0.22 : 0.09,
      shadowRadius: 18,
      elevation: 5,
    },
    /**
     * Мягкое свечение мелких акцентов (чип, FAB, CTA, ползунок).
     * Смещение вниз + небольшой radius — без «ореола-размытия» (offset 0,0).
     */
    accentGlow: {
      shadowColor: isDarkMode ? '#D8EA78' : '#9BB42E',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.48 : 0.38,
      shadowRadius: 7,
      elevation: 4,
    },
    accentGlowLilac: {
      shadowColor: isDarkMode ? '#D4B8F0' : '#B898E0',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: isDarkMode ? 0.4 : 0.32,
      shadowRadius: 7,
      elevation: 3,
    },
  };
};

export const shadows = getShadows(false);

/** Градиент подложки экрана: лёгкий сдвиг тона, не «обои». */
export const getScreenGradient = (isDarkMode = false) =>
  isDarkMode
    ? {
        colors: ['#141018', '#1C1824', '#181620'],
        locations: [0, 0.55, 1],
        start: { x: 0, y: 0 },
        end: { x: 0, y: 1 },
      }
    : {
        colors: ['#FFFEFF', '#EFE6F7', '#F8F4FB'],
        locations: [0, 0.42, 1],
        start: { x: 0, y: 0 },
        end: { x: 0.85, y: 1 },
      };
