import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { getColors, getGlassTokens, getShadows, spacing, borderRadius, fontFamily } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getCartCount } from '../utils/cart';

const tabs = [
  { id: 'Menu', label: 'Меню', icon: 'restaurant-outline', iconActive: 'restaurant' },
  { id: 'Cart', label: 'Корзина', icon: 'bag-outline', iconActive: 'bag' },
  { id: 'Booking', label: 'Бронь', icon: 'calendar-outline', iconActive: 'calendar' },
  { id: 'Profile', label: 'Профиль', icon: 'person-outline', iconActive: 'person' },
];

const BAR_PADDING_TOP = 12;
const ICON_SLOT_H = 44;

export default function TabBar({ currentScreen, onNavigate, cartItems, menuDishes = [] }) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = getColors(isDarkMode);
  const glass = getGlassTokens(isDarkMode);
  const shadowsThemed = getShadows(isDarkMode);
  const cartCount = getCartCount(cartItems, menuDishes);
  const isCompact = width < 380;
  const bottomPad = Math.max(insets.bottom, spacing.sm);

  const slideX = useRef(new Animated.Value(0)).current;
  const tabLayouts = useRef(tabs.map(() => null));
  const iconScaleMap = useRef(
    Object.fromEntries(tabs.map((tab) => [tab.id, new Animated.Value(1)]))
  ).current;
  const didInit = useRef(false);

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === currentScreen));
  const dotSize = 6;

  const animateDotToActive = React.useCallback(() => {
    const layout = tabLayouts.current[activeIndex];
    if (!layout || layout.width <= 0) return;
    const target = layout.x + layout.width / 2 - dotSize / 2;

    if (!didInit.current) {
      slideX.setValue(target);
      didInit.current = true;
      return;
    }

    Animated.timing(slideX, {
      toValue: target,
      duration: 220,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, dotSize, slideX]);

  useEffect(() => {
    animateDotToActive();
  }, [animateDotToActive]);

  const onTabLayout = (index, event) => {
    const { x, width } = event.nativeEvent.layout;
    if (width <= 0) return;
    tabLayouts.current[index] = { x, width };
    if (index === activeIndex) {
      animateDotToActive();
    }
  };

  const pulseTabIcon = (tabId) => {
    const scale = iconScaleMap[tabId];
    if (!scale) return;
    scale.stopAnimation(() => {
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 90,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 140,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleTabNavigate = React.useCallback((tabId) => {
    if (tabId === currentScreen) return;
    onNavigate(tabId);
  }, [currentScreen, onNavigate]);

  const handleTabPulse = React.useCallback((tabId) => {
    if (tabId === currentScreen) return;
    pulseTabIcon(tabId);
  }, [currentScreen]);

  return (
    <View style={[styles.floatWrap, { paddingBottom: bottomPad }]}>
      <View style={[styles.tabBarShell, shadowsThemed.glass, { borderColor: glass.border, borderRadius: borderRadius['2xl'] }]}>
        <BlurView
          intensity={glass.blurIntensity}
          tint={glass.blurTint}
          experimentalBlurMethod={Platform.OS === 'android' ? 'dimezisBlurView' : undefined}
          style={[StyleSheet.absoluteFill, { borderRadius: borderRadius['2xl'], overflow: 'hidden' }]}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { backgroundColor: glass.fillStrong, borderRadius: borderRadius['2xl'] }]}
        />
        <View style={styles.tabsRow}>
          <View style={styles.indicatorTrack} pointerEvents="none">
            <Animated.View
              style={[
                styles.indicatorDot,
                shadowsThemed.accentGlow,
                {
                  width: dotSize,
                  height: dotSize,
                  top: (ICON_SLOT_H - dotSize) / 2,
                  backgroundColor: colors.primary,
                  transform: [{ translateX: slideX }],
                },
              ]}
            />
          </View>
          {tabs.map((tab, index) => {
            const active = currentScreen === tab.id;
            const showBadge = tab.id === 'Cart' && cartCount > 0;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                onLayout={(event) => onTabLayout(index, event)}
                onPressIn={() => handleTabNavigate(tab.id)}
                onPress={() => handleTabPulse(tab.id)}
                delayPressIn={0}
                activeOpacity={0.85}
              >
                <View style={styles.iconSlot}>
                  <Animated.View style={{ transform: [{ scale: iconScaleMap[tab.id] || 1 }] }}>
                    <Ionicons
                      name={active ? tab.iconActive : tab.icon}
                      size={isCompact ? 23 : 25}
                      color={active ? colors.primaryDark : colors.textMuted}
                    />
                  </Animated.View>
                  {showBadge ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }, shadowsThemed.accentGlow]}>
                      <Text style={[styles.badgeText, { color: colors.black }]}>{cartCount > 9 ? '9+' : cartCount}</Text>
                    </View>
                  ) : null}
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: active ? colors.text : colors.textMuted,
                      fontFamily: active ? fontFamily.sansBold : fontFamily.sansMedium,
                      fontSize: isCompact ? 10 : 11,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
  },
  tabBarShell: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: BAR_PADDING_TOP,
    paddingBottom: 10,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  tabsRow: {
    flexDirection: 'row',
    width: '100%',
    position: 'relative',
  },
  indicatorTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: ICON_SLOT_H,
  },
  indicatorDot: {
    position: 'absolute',
    left: 0,
    borderRadius: borderRadius.round,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
    gap: 4,
  },
  iconSlot: {
    height: ICON_SLOT_H,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  badge: {
    position: 'absolute',
    right: '28%',
    top: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: fontFamily.sansBold,
  },
  tabLabel: {
    textAlign: 'center',
    width: '100%',
  },
});
