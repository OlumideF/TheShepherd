import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { MediaCard } from '@/features/media/components/MediaCard';
import { YoutubePlayer } from '@/features/media/components/YoutubePlayer';
import { useLiveMedia, useMediaArchive } from '@/features/media/hooks/useMedia';
import { usePhotoAlbums } from '@/features/media/hooks/usePhotoAlbums';

type TabKey = 'sermons' | 'live' | 'photos';

export default function MediaScreen() {
  const [tab, setTab] = useState<TabKey>('sermons');

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppText variant="title">Media</AppText>
        <AppText muted>Sermons, live services, and photo albums.</AppText>
        <View style={styles.tabs}>
          <TabChip label="Sermons" active={tab === 'sermons'} onPress={() => setTab('sermons')} />
          <TabChip label="Live" active={tab === 'live'} onPress={() => setTab('live')} />
          <TabChip label="Photos" active={tab === 'photos'} onPress={() => setTab('photos')} />
        </View>
      </View>

      {tab === 'sermons' ? <SermonsPane /> : null}
      {tab === 'live' ? <LivePane /> : null}
      {tab === 'photos' ? <PhotosPane /> : null}
    </Screen>
  );
}

function TabChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <AppText
        variant="bodyStrong"
        color={active ? '#fff' : colors.ink}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function SermonsPane() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [series, setSeries] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [topic, setTopic] = useState('');
  const filters = useMemo(
    () => ({ search, series, speaker, topic }),
    [search, series, speaker, topic],
  );
  const { data, isLoading, isError, error, refetch, isFetching } =
    useMediaArchive(filters);

  return (
    <View style={styles.flex}>
      <View style={styles.filters}>
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Title, series, speaker, topic"
          autoCapitalize="none"
        />
        <View style={styles.filterRow}>
          <View style={styles.filterHalf}>
            <TextField label="Series" value={series} onChangeText={setSeries} />
          </View>
          <View style={styles.filterHalf}>
            <TextField label="Speaker" value={speaker} onChangeText={setSpeaker} />
          </View>
        </View>
        <TextField label="Topic" value={topic} onChangeText={setTopic} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : isError ? (
        <View style={styles.empty}>
          <AppText color={colors.danger}>
            {error instanceof Error ? error.message : 'Could not load sermons.'}
          </AppText>
          <AppText muted onPress={() => refetch()}>
            Tap to retry
          </AppText>
        </View>
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={isFetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppText variant="bodyStrong">No sermons yet</AppText>
              <AppText muted>
                When an admin publishes a media item, it will appear here.
              </AppText>
            </View>
          }
          renderItem={({ item }) => (
            <MediaCard
              item={item}
              onPress={() => router.push(`/media/${item.id}` as Href)}
            />
          )}
        />
      )}
    </View>
  );
}

function LivePane() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useLiveMedia();

  if (isLoading) {
    return <ActivityIndicator color={colors.accent} style={styles.loader} />;
  }

  if (isError) {
    return (
      <View style={styles.empty}>
        <AppText color={colors.danger}>
          {error instanceof Error ? error.message : 'Could not load live stream.'}
        </AppText>
      </View>
    );
  }

  if (!data?.youtube_id) {
    return (
      <View style={styles.empty}>
        <AppText variant="bodyStrong">Nothing live right now</AppText>
        <AppText muted>
          When a service is live, it will play here. Afterward it moves into the
          sermon archive automatically when the admin updates the YouTube id.
        </AppText>
        <Pressable onPress={() => refetch()}>
          <AppText color={colors.accent}>Refresh</AppText>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.live}>
      <AppText variant="heading">{data.title}</AppText>
      {data.speaker ? <AppText muted>{data.speaker}</AppText> : null}
      <YoutubePlayer videoId={data.youtube_id} height={240} />
      <Pressable onPress={() => router.push(`/media/${data.id}` as Href)}>
        <AppText color={colors.accent}>Open full sermon page</AppText>
      </Pressable>
    </ScrollView>
  );
}

function PhotosPane() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch, isFetching } =
    usePhotoAlbums();

  if (isLoading) {
    return <ActivityIndicator color={colors.accent} style={styles.loader} />;
  }

  if (isError) {
    return (
      <View style={styles.empty}>
        <AppText color={colors.danger}>
          {error instanceof Error ? error.message : 'Could not load albums.'}
        </AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={data ?? []}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      refreshing={isFetching}
      onRefresh={refetch}
      ListEmptyComponent={
        <View style={styles.empty}>
          <AppText variant="bodyStrong">No photo albums yet</AppText>
          <AppText muted>
            Event albums will show up here once published by an admin.
          </AppText>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          style={styles.albumCard}
          onPress={() => router.push(`/media/albums/${item.id}` as Href)}
        >
          <AppText variant="bodyStrong">{item.title}</AppText>
          {item.taken_on ? (
            <AppText variant="caption" muted>
              {item.taken_on}
            </AppText>
          ) : null}
          {item.description ? (
            <AppText variant="caption" muted numberOfLines={2}>
              {item.description}
            </AppText>
          ) : null}
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tabs: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  chipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  flex: {
    flex: 1,
  },
  filters: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterHalf: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
    flexGrow: 1,
  },
  loader: {
    marginTop: spacing.xl,
  },
  empty: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  live: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  albumCard: {
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
});
