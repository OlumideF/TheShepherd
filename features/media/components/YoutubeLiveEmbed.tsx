import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

type YoutubeLiveEmbedProps = {
  channelId: string;
  height?: number;
};

/**
 * Official YouTube channel live_stream embed.
 * Used when no programmed media_item is marked is_live.
 */
export function YoutubeLiveEmbed({
  channelId,
  height = 240,
}: YoutubeLiveEmbedProps) {
  const uri = `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}`;

  return (
    <View style={[styles.wrap, { height }]} accessibilityLabel="YouTube live stream">
      <WebView
        source={{ uri }}
        style={{ flex: 1, backgroundColor: '#000' }}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        javaScriptEnabled
        domStorageEnabled
      />
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
