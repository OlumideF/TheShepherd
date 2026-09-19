import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

type YoutubePlayerProps = {
  videoId: string;
  height?: number;
};

/** Web: official YouTube IFrame embed (no scraping / download). */
export function YoutubePlayer({ videoId, height = 220 }: YoutubePlayerProps) {
  return (
    <View style={[styles.wrap, { height }]} accessibilityLabel="YouTube video player">
      {createElement('iframe', {
        title: 'YouTube video player',
        width: '100%',
        height,
        src: `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0`,
        allow:
          'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
        allowFullScreen: true,
        style: {
          borderWidth: 0,
          width: '100%',
          height: '100%',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#000',
  },
});
