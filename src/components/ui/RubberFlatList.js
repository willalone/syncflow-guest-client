import React from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../constants/theme';
import { useRubberOverscroll } from '../../hooks/useRubberOverscroll';

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

/**
 * FlatList с резиновым overscroll и pull-to-refresh.
 */
export default function RubberFlatList({
  onRefresh,
  refreshing = false,
  rubberEnabled = true,
  style,
  ...rest
}) {
  const { isDarkMode } = useTheme();
  const colors = getColors(isDarkMode);
  const { scrollHandler, panGesture, rubberTranslateStyle, scrollBounceProps } = useRubberOverscroll({
    enabled: rubberEnabled,
  });

  const nativeGesture = Gesture.Native();
  const composed = Gesture.Simultaneous(nativeGesture, panGesture);

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.wrap, rubberTranslateStyle]}>
        <AnimatedFlatList
          style={[styles.list, style]}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.primaryDark}
                colors={[colors.primaryDark]}
                progressBackgroundColor={colors.card}
              />
            ) : undefined
          }
          {...scrollBounceProps}
          {...rest}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
});
