import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

type YoutubeLiveEmbedProps = {
  channelId: string;
  height?: number;
};

/** Web: official YouTube channel live_stream iframe. */
export function YoutubeLiveEmbed({
  channelId,
  height = 240,
}: YoutubeLiveEmbedProps) {
  const src = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`;

  return (
    <View style={[styles.wrap, { height }]} accessibilityLabel="YouTube live stream">
      {createElement('iframe', {
        title: 'YouTube live stream',
        width: '100%',
        height,
        src,
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
