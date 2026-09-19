import { StyleSheet, View } from 'react-native';
import YoutubePlayerNative from 'react-native-youtube-iframe';

type YoutubePlayerProps = {
  videoId: string;
  height?: number;
};

/** Native YouTube IFrame player (iOS/Android). */
export function YoutubePlayer({ videoId, height = 220 }: YoutubePlayerProps) {
  return (
    <View style={styles.wrap} accessibilityLabel="YouTube video player">
      <YoutubePlayerNative height={height} videoId={videoId} webViewProps={{ allowsInlineMediaPlayback: true }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
  },
});
