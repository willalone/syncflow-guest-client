import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, TouchableOpacity, View, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND_LILAC, BRAND_LIME, getColors, getShadows, spacing, borderRadius, fontFamily } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';
import { getCartCount } from '../utils/cart';

const tabs = [
  { id: 'Menu', label: 'Меню', icon: 'restaurant-outline' },
  { id: 'Bar', label: 'Бар', icon: 'wine-outline' },
  { id: 'Cart', label: 'Корзина', icon: 'cart-outline' },
  { id: 'Booking', label: 'Бронь', icon: 'calendar-outline' },
  { id: 'Profile', label: 'Профиль', icon: 'person-outline' },
];

/** Полоска между иконкой и подписью: визуально по центру колонки иконки. */
const INDICATOR_W = 34;
const INDICATOR_H = 3;
const BAR_PADDING_TOP = 10;
const ICON_SLOT_H = 46;
const INDICATOR_GAP_H = 14;
const INDICATOR_TOP = BAR_PADDING_TOP + ICON_SLOT_H + (INDICATOR_GAP_H - INDICATOR_H) / 2;

export default function TabBar({ currentScreen, onNavigate, cartItems }) {
  const { isDarkMode } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const colors = getColors(isDarkMode);
  const shadowsThemed = getShadows(isDarkMode);
  const cartCount = getCartCount(cartItems);
  const isCompact = width < 380;
  const bottomPad = Math.max(insets.bottom, spacing.sm);

  const [tabsWidth, setTabsWidth] = useState(0);
  const slideX = useRef(new Animated.Value(0)).current;
  const iconScaleMap = useRef(
    Object.fromEntries(tabs.map((tab) => [tab.id, new Animated.Value(1)]))
  ).current;
  const didInit = useRef(false);

  const activeIndex = Math.max(0, tabs.findIndex((t) => t.id === currentScreen));

  useEffect(() => {
    if (tabsWidth <= 0) return;
    const segment = tabsWidth / tabs.length;
    const target = activeIndex * segment + (segment - INDICATOR_W) / 2;

    if (!didInit.current) {
      slideX.setValue(target);
      didInit.current = true;
      return;
    }

    Animated.timing(slideX, {
      toValue: target,
      duration: 210,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, tabsWidth, slideX]);

  const onTabsLayout = (e) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && Math.abs(w - tabsWidth) > 0.5) {
      setTabsWidth(w);
    }
  };

  const pulseTabIcon = (tabId) => {
    const scale = iconScaleMap[tabId];
    if (!scale) return;
    scale.stopAnimation(() => {
      scale.setValue(1);
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.05,
          duration: 85,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
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
      <View
        style={[
          styles.tabBar,
          shadowsThemed.medium,
          {
            backgroundColor: colors.card,
            borderColor: colors.hairline,
          },
        ]}
      >
        <View style={styles.tabsRow} onLayout={onTabsLayout}>
          {tabs.map((tab) => {
            const active = currentScreen === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={styles.tabButton}
                onPressIn={() => handleTabNavigate(tab.id)}
                onPress={() => handleTabPulse(tab.id)}
                delayPressIn={0}
                activeOpacity={0.85}
              >
                <View style={styles.iconSlot}>
                  <Animated.View style={{ transform: [{ scale: iconScaleMap[tab.id] || 1 }] }}>
                    <Ionicons
                      name={tab.icon}
                      size={isCompact ? 22 : 24}
                      color={active ? colors.primaryDark : colors.textLight}
                    />
                  </Animated.View>
                </View>
                <View style={styles.indicatorSpacer} />
                <Text
                  style={[
                    styles.tabLabel,
                    {
                      color: active ? colors.text : colors.textLight,
                      fontFamily: active ? fontFamily.sansBold : fontFamily.sansMedium,
                      fontSize: isCompact ? 10 : 11,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {tab.id === 'Cart' && cartCount > 0 ? `${tab.label} · ${cartCount}` : tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.indicatorTrack} pointerEvents="none">
          <Animated.View
            style={[
              styles.indicator,
              {
                width: INDICATOR_W,
                height: INDICATOR_H,
                transform: [{ translateX: slideX }],
              },
            ]}
          >
            <LinearGradient
              colors={[BRAND_LILAC, BRAND_LIME]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  floatWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
  },
  tabBar: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius['2xl'],
    paddingTop: BAR_PADDING_TOP,
    paddingBottom: 12,
    paddingHorizontal: 2,
    overflow: 'hidden',
  },
  tabsRow: {
    flexDirection: 'row',
    width: '100%',
  },
  indicatorTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: INDICATOR_TOP,
    height: INDICATOR_H,
  },
  indicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: 3,
    overflow: 'hidden',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    minWidth: 0,
  },
  iconSlot: {
    height: ICON_SLOT_H,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  indicatorSpacer: {
    height: INDICATOR_GAP_H,
    width: '100%',
  },
  tabLabel: {
    textAlign: 'center',
    width: '100%',
    marginTop: 2,
  },
});
