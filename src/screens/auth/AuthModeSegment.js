import React from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';

export default function AuthModeSegment({
  styles,
  colors,
  fontFamily,
  segmentHalf,
  pillX,
  isRegisterMode,
  setIsRegisterMode,
  setAuthError,
  onSegmentLayout,
}) {
  return (
    <View
      style={[
        styles.segment,
        {
          backgroundColor: 'rgba(255,255,255,0.1)',
        },
      ]}
      onLayout={onSegmentLayout}
    >
      <Animated.View
        style={[
          styles.segmentPill,
          { backgroundColor: colors.primary },
          segmentHalf > 0 ? { width: segmentHalf, opacity: 1, transform: [{ translateX: pillX }] } : { width: 0, opacity: 0 },
        ]}
      />
      <TouchableOpacity
        style={styles.segmentBtn}
        onPress={() => {
          setIsRegisterMode(false);
          setAuthError('');
        }}
        activeOpacity={0.9}
      >
        <Text
          style={[
            styles.segmentLabel,
            {
              color: !isRegisterMode ? colors.black : colors.textLight,
              fontFamily: !isRegisterMode ? fontFamily.sansBold : fontFamily.sansMedium,
            },
          ]}
        >
          Вход
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.segmentBtn}
        onPress={() => {
          setIsRegisterMode(true);
          setAuthError('');
        }}
        activeOpacity={0.9}
      >
        <Text
          style={[
            styles.segmentLabel,
            {
              color: isRegisterMode ? colors.black : colors.textLight,
              fontFamily: isRegisterMode ? fontFamily.sansBold : fontFamily.sansMedium,
            },
          ]}
        >
          Регистрация
        </Text>
      </TouchableOpacity>
    </View>
  );
}
