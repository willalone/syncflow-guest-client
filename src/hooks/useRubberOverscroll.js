import { useMemo } from 'react';
import { Platform } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const SPRING_BACK = { damping: 20, stiffness: 220, mass: 0.65 };

/**
 * Резиновый overscroll: iOS — отрицательный contentOffset; Android — доп. Pan вверху списка.
 */
export function useRubberOverscroll({
  enabled = true,
  maxPull = 96,
  scrollRubberFactor = 0.42,
  panRubberFactor = 0.5,
} = {}) {
  const scrollY = useSharedValue(0);
  const panPull = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
      if (event.contentOffset.y > 2) {
        panPull.value = 0;
      }
    },
  });

  const pullDistance = useDerivedValue(() => {
    if (!enabled) return 0;
    const fromScroll = scrollY.value < 0 ? Math.min(-scrollY.value * scrollRubberFactor, maxPull) : 0;
    const fromPan = panPull.value;
    return Math.min(fromScroll + fromPan, maxPull);
  });

  const panGesture = useMemo(() => {
    if (!enabled) return Gesture.Pan().enabled(false);
    return Gesture.Pan()
      .activeOffsetY(6)
      .failOffsetX([-28, 28])
      .onUpdate((event) => {
        if (scrollY.value <= 1 && event.translationY > 0) {
          panPull.value = Math.min(event.translationY * panRubberFactor, maxPull);
        }
      })
      .onEnd(() => {
        panPull.value = withSpring(0, SPRING_BACK);
      })
      .onFinalize(() => {
        panPull.value = withSpring(0, SPRING_BACK);
      });
  }, [enabled, maxPull, panRubberFactor, scrollY, panPull]);

  const rubberTranslateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: pullDistance.value }],
  }));

  const scrollBounceProps = Platform.select({
    ios: { bounces: true, alwaysBounceVertical: true },
    android: { overScrollMode: 'always' },
    default: {},
  });

  return {
    scrollY,
    pullDistance,
    scrollHandler,
    panGesture,
    rubberTranslateStyle,
    scrollBounceProps,
  };
}
