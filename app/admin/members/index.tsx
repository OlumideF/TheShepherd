import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Link, Stack, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useAdminMembers } from '@/features/admin/hooks/useAdminMembers';
import { canAccessAdminHub } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AdminMembersScreen() {
  const { profile } = useAuth();
  const allowed = canAccessAdminHub(profile);
  const [search, setSearch] = useState('');
  const { data = [], isLoading, error } = useAdminMembers(allowed, search);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Members' }} />
        <AppText color={colors.danger}>Admins only.</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Roles & access' }} />
      <View style={styles.header}>
        <TextField
          label="Search members"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : error ? (
        <AppText color={colors.danger} style={styles.pad}>
          Could not load members.
        </AppText>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<AppText muted>No members found.</AppText>}
          renderItem={({ item }) => (
            <Link href={`/admin/members/${item.id}` as Href} asChild>
              <Pressable style={styles.row}>
                <AppText variant="bodyStrong">
                  {item.display_name ||
                    [item.first_name, item.last_name].filter(Boolean).join(' ') ||
                    item.email ||
                    'Member'}
                </AppText>
                <AppText variant="caption" muted>
                  {item.email ?? '—'} · {item.role} · {item.membership_status}
                  {item.can_upload_media ? ' · upload' : ''}
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
