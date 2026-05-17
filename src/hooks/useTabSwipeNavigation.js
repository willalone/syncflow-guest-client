import React from 'react';
import { Animated, Easing, PanResponder } from 'react-native';

export function useTabSwipeNavigation({
  screenWidth,
  tabOrder,
  isAuthenticated,
  currentScreen,
  selectedDish,
  selectedBooking,
  setSelectedDish,
  setSelectedBooking,
  setCurrentScreen,
  tabNavigationRef,
}) {
  const transitionOverlayOpacity = React.useRef(new Animated.Value(0)).current;
  const transitionOverlayScale = React.useRef(new Animated.Value(1.02)).current;
  const currentScreenRef = React.useRef(currentScreen);
  const canSwipeTabs = isAuthenticated && !selectedDish && !selectedBooking && tabOrder.includes(currentScreen);
  const canSwipeTabsRef = React.useRef(canSwipeTabs);
  const navigateWhenReady = React.useCallback(
    (screen) => {
      const nav = tabNavigationRef.current;
      if (!nav) return;
      if (typeof nav.isReady === 'function' && !nav.isReady()) return;
      nav.navigate(screen);
    },
    [tabNavigationRef]
  );

  React.useEffect(() => {
    currentScreenRef.current = currentScreen;
    canSwipeTabsRef.current = canSwipeTabs;
  }, [currentScreen, canSwipeTabs]);

  React.useEffect(() => {
    if (!tabOrder.includes(currentScreen)) return;
    navigateWhenReady(currentScreen);
  }, [currentScreen, tabOrder, navigateWhenReady]);

  const navigateToScreen = React.useCallback(
    (screen) => {
      const fromScreen = currentScreenRef.current;
      const canUseTabTransition =
        tabOrder.includes(fromScreen) && tabOrder.includes(screen) && !selectedDish && !selectedBooking;
      if (canUseTabTransition && fromScreen !== screen) {
        transitionOverlayOpacity.stopAnimation();
        transitionOverlayScale.stopAnimation();
        transitionOverlayOpacity.setValue(0);
        transitionOverlayScale.setValue(1.012);
        Animated.parallel([
          Animated.sequence([
            Animated.timing(transitionOverlayOpacity, {
              toValue: 0.062,
              duration: 70,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(transitionOverlayOpacity, {
              toValue: 0,
              duration: 180,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(transitionOverlayScale, {
            toValue: 1,
            duration: 220,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start();
        setSelectedDish(null);
        setSelectedBooking(null);
        setCurrentScreen(screen);
        navigateWhenReady(screen);
        return;
      }
      setSelectedDish(null);
      setSelectedBooking(null);
      setCurrentScreen(screen);
    },
    [
      selectedDish,
      selectedBooking,
      setCurrentScreen,
      setSelectedBooking,
      setSelectedDish,
      tabNavigationRef,
      tabOrder,
      transitionOverlayOpacity,
      transitionOverlayScale,
      navigateWhenReady,
    ]
  );

  const navigateAdjacentTab = React.useCallback(
    (delta) => {
      const idx = tabOrder.indexOf(currentScreenRef.current);
      if (idx < 0) return;
      const nextIdx = idx + delta;
      if (nextIdx < 0 || nextIdx >= tabOrder.length) return;
      navigateToScreen(tabOrder[nextIdx]);
    },
    [navigateToScreen, tabOrder]
  );

  const leftEdgeSwipeResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        return gestureState.x0 <= 26;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        const { dx, dy, x0 } = gestureState;
        const fromEdge = x0 <= 26;
        if (!fromEdge) return false;
        return dx < -12 && Math.abs(dx) > Math.abs(dy) * 1.18;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return;
        const { dx, vx } = gestureState;
        if (dx < -34 || vx < -0.34) {
          navigateAdjacentTab(1);
        }
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  const rightEdgeSwipeResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        return gestureState.x0 >= screenWidth - 26;
      },
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return false;
        const { dx, dy, x0 } = gestureState;
        const fromEdge = x0 >= screenWidth - 26;
        if (!fromEdge) return false;
        return dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.18;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!canSwipeTabsRef.current) return;
        const { dx, vx } = gestureState;
        if (dx > 34 || vx > 0.34) {
          navigateAdjacentTab(-1);
        }
      },
      onPanResponderTerminate: () => {},
    })
  ).current;

  return {
    canSwipeTabs,
    navigateToScreen,
    leftEdgeSwipeResponder,
    rightEdgeSwipeResponder,
    transitionOverlayOpacity,
    transitionOverlayScale,
  };
}
