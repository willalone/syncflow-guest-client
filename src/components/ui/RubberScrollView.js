import React from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../constants/theme';
import { useRubberOverscroll } from '../../hooks/useRubberOverscroll';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

/**
 * ScrollView с резиновым overscroll и опциональным pull-to-refresh.
 */
export default function RubberScrollView({
  children,
  onRefresh,
  refreshing = false,
  style,
  contentContainerStyle,
  rubberEnabled = true,
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
      <AnimatedScrollView
        style={[styles.scroll, style]}
        contentContainerStyle={contentContainerStyle}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
      >
        <Animated.View style={rubberTranslateStyle}>{children}</Animated.View>
      </AnimatedScrollView>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
});
