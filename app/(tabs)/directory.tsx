import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing } from '@/constants/theme';
import { MemberCard } from '@/features/members/components/MemberCard';
import { useDirectory } from '@/features/members/hooks/useDirectory';

export default function DirectoryScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch, isFetching } =
    useDirectory(search);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <AppText variant="title">Directory</AppText>
        <AppText muted>
          Members who opted in to be findable. Search by name.
        </AppText>
        <TextField
          label="Search"
          value={search}
          onChangeText={setSearch}
          placeholder="Search members"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : isError ? (
        <View style={styles.empty}>
          <AppText color={colors.danger}>
            {error instanceof Error ? error.message : 'Could not load directory.'}
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
              <AppText variant="bodyStrong">No members found</AppText>
              <AppText muted>
                Opt in from Profile → Privacy to appear here.
              </AppText>
            </View>
          }
          renderItem={({ item }) => (
            <MemberCard
              member={item}
              onPress={() => router.push(`/member/${item.id}` as Href)}
            />
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
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
});
