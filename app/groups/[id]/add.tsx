import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  useAddGroupMember,
  useGroup,
  useMyGroupMembership,
  useSearchMembersForGroup,
} from '@/features/groups/hooks/useGroups';

function candidateLabel(item: {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}): string {
  if (item.display_name?.trim()) return item.display_name.trim();
  const parts = [item.first_name, item.last_name].filter(Boolean).join(' ').trim();
  if (parts) return parts;
  return item.email?.trim() || 'Member';
}

export default function AddGroupMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const groupId = typeof id === 'string' ? id : undefined;
  const router = useRouter();
  const { profile, user } = useAuth();
  const profileId = profile?.id ?? user?.id;
  const isAdmin = profile?.role === 'admin';

  const { data: group, isLoading: groupLoading } = useGroup(groupId);
  const { data: membership } = useMyGroupMembership(groupId, profileId);
  const isLeader =
    isAdmin ||
    (membership?.status === 'approved' && membership.role_in_group === 'leader');

  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [addedIds, setAddedIds] = useState<string[]>([]);

  const { data: candidates = [], isLoading: searchLoading } =
    useSearchMembersForGroup(groupId, search, isLeader);
  const addMember = useAddGroupMember();

  async function onAdd(profileIdToAdd: string) {
    if (!groupId) return;
    setError(null);
    try {
      await addMember.mutateAsync({
        groupId,
        profileId: profileIdToAdd,
      });
      setAddedIds((prev) => [...prev, profileIdToAdd]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add member.');
    }
  }

  if (groupLoading) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Add members' }} />
        <ActivityIndicator color={colors.accent} />
      </Screen>
    );
  }

  if (!group || !isLeader) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Add members' }} />
        <AppText color={colors.danger}>
          Only admins and group leaders can add members.
        </AppText>
        <Button
          label="Back"
          variant="ghost"
          onPress={() => router.back()}
          style={styles.back}
        />
      </Screen>
    );
  }

  const visible = candidates.filter((c) => !addedIds.includes(c.id));

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ title: 'Add members' }} />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="title">Add to {group.name}</AppText>
            <AppText muted>
              {isAdmin
                ? 'Search all members by name or email.'
                : 'Search the member directory. For others, send an invite link.'}
            </AppText>
            <TextField
              label="Search"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Name or email"
            />
            {error ? <AppText color={colors.danger}>{error}</AppText> : null}
            {searchLoading ? (
              <ActivityIndicator color={colors.accent} />
            ) : null}
            <Button
              label="Done"
              variant="secondary"
              onPress={() =>
                router.replace(`/groups/${group.id}` as Href)
              }
            />
          </View>
        }
        ListEmptyComponent={
          !searchLoading ? (
            <AppText muted>
              {search.trim()
                ? 'No matching members to add.'
                : 'Type to search, or leave blank to see recent candidates.'}
            </AppText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onAdd(item.id)}
            disabled={addMember.isPending}
            style={styles.row}
          >
            <View style={styles.rowText}>
              <AppText variant="bodyStrong">{candidateLabel(item)}</AppText>
              {item.email ? (
                <AppText variant="caption" muted>
                  {item.email}
                </AppText>
              ) : null}
            </View>
            <AppText color={colors.accent}>Add</AppText>
          </Pressable>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.canvasElevated,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  back: {
    marginTop: spacing.md,
  },
});
