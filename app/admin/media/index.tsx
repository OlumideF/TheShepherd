import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Link, Stack, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useAdminMediaList } from '@/features/admin/hooks/useAdminMedia';
import { canPublishMedia } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AdminMediaListScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canPublishMedia(profile);
  const { data = [], isLoading, error } = useAdminMediaList(allowed);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Media' }} />
        <AppText color={colors.danger}>
          You don’t have permission to publish media.
        </AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Publish media' }} />
      <View style={styles.header}>
        <AppText muted>
          Create a sermon with YouTube first, then attach audio later.
        </AppText>
        <Button
          label="New sermon"
          onPress={() => router.push('/admin/media/create' as Href)}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <AppText color={colors.danger} style={styles.pad}>
          Could not load media.
        </AppText>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <AppText muted>No media items yet.</AppText>
          }
          renderItem={({ item }) => (
            <Link href={`/admin/media/${item.id}` as Href} asChild>
              <Pressable style={styles.row}>
                <AppText variant="bodyStrong">{item.title}</AppText>
                <AppText variant="caption" muted>
                  {item.speaker || 'No speaker'} ·{' '}
                  {item.published ? 'Published' : 'Draft'} · audio{' '}
                  {item.audio_status}
                </AppText>
              </Pressable>
            </Link>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  loader: {
    marginTop: spacing.xl,
  },
  pad: {
    padding: spacing.lg,
  },
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
});
