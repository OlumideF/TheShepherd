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
import { useAdminAlbums } from '@/features/admin/hooks/useAdminAlbums';
import { canPublishMedia } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AdminAlbumsScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const allowed = canPublishMedia(profile);
  const { data = [], isLoading, error } = useAdminAlbums(allowed);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Albums' }} />
        <AppText color={colors.danger}>Publish permission required.</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Photo albums' }} />
      <View style={styles.header}>
        <Button
          label="New album"
          onPress={() => router.push('/admin/albums/create' as Href)}
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <AppText color={colors.danger} style={styles.pad}>
          Could not load albums.
        </AppText>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<AppText muted>No albums yet.</AppText>}
          renderItem={({ item }) => (
            <Link href={`/admin/albums/${item.id}` as Href} asChild>
              <Pressable style={styles.row}>
                <AppText variant="bodyStrong">{item.title}</AppText>
                <AppText variant="caption" muted>
                  {item.published ? 'Published' : 'Draft'}
                  {item.taken_on ? ` · ${item.taken_on}` : ''}
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
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  loader: { marginTop: spacing.xl },
  pad: { padding: spacing.lg },
  list: {
    padding: spacing.lg,
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
