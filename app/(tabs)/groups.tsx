import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { GroupCard } from '@/features/groups/components/GroupCard';
import {
  canManageGroups,
  useGroups,
} from '@/features/groups/hooks/useGroups';

export default function GroupsScreen() {
  const router = useRouter();
  const { profile, user } = useAuth();
  const profileId = profile?.id ?? user?.id;
  const { data: groups = [], isLoading, isError, error } = useGroups(profileId);
  const showCreate = canManageGroups(profile?.role);

  return (
    <Screen padded={false}>
      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <AppText variant="title">Groups</AppText>
                <AppText muted>
                  Browse ministries and small groups. Request to join — leaders
                  approve.
                </AppText>
              </View>
              {showCreate ? (
                <Button
                  label="New"
                  variant="secondary"
                  onPress={() => router.push('/groups/create' as Href)}
                />
              ) : null}
            </View>
            {isLoading ? (
              <ActivityIndicator color={colors.accent} style={styles.loader} />
            ) : null}
            {isError ? (
              <AppText color={colors.danger}>
                {error instanceof Error ? error.message : 'Could not load groups.'}
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          !isLoading && !isError ? (
            <AppText muted style={styles.empty}>
              No groups published yet.
              {showCreate ? ' Create the first ministry or small group.' : ''}
            </AppText>
          ) : null
        }
        renderItem={({ item }) => (
          <GroupCard
            group={item}
            onPress={() => router.push(`/groups/${item.id}` as Href)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  loader: {
    marginVertical: spacing.md,
  },
  empty: {
    marginTop: spacing.md,
  },
});
