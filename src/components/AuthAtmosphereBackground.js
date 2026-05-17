import React, { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';

const VIDEO_SOURCE = require('../../assets/shadergradient.mov');

/**
 * Фон входа: зацикленное беззвучное видео (expo-video).
 * audioMixingMode: mixWithOthers — не останавливать Spotify/Apple Music и др.
 */
export default function AuthAtmosphereBackground({ isDarkMode }) {
  const [useFallback, setUseFallback] = useState(false);
  const player = useVideoPlayer(VIDEO_SOURCE, (p) => {
    p.loop = true;
    p.muted = true;
    p.volume = 0;
    p.audioMixingMode = 'mixWithOthers';
    p.play();
  });

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        try {
          player.play();
        } catch {
          // no-op
        }
        return;
      }
      try {
        player.pause();
      } catch {
        // no-op
      }
    });
    return () => {
      sub.remove();
      try {
        player.pause();
      } catch {
        // no-op
      }
    };
  }, [player]);

  useEventListener(player, 'statusChange', ({ status, error }) => {
    if (status === 'error' || error) setUseFallback(true);
  });

  const fallbackColors = isDarkMode
    ? ['#141016', '#1A1622', '#161C18', '#181420']
    : ['#F0E8FF', '#E6F4DA', '#FFF2E6', '#EDE4F6'];

  return (
    <View style={styles.root} pointerEvents="none">
      {!useFallback ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        <LinearGradient
          colors={fallbackColors}
          locations={[0, 0.34, 0.64, 1]}
          start={{ x: 0.06, y: 0 }}
          end={{ x: 0.94, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
