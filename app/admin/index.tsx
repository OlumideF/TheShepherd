import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Link, Stack, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useAdminDashboard } from '@/features/admin/hooks/useAdminDashboard';
import { canAccessAdminHub } from '@/features/admin/utils/permissions';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function AdminHubScreen() {
  const { profile, user } = useAuth();
  const allowed = canAccessAdminHub(profile, user?.email);
  const { data, isLoading, error } = useAdminDashboard(allowed);

  if (!allowed) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: true, title: 'Admin' }} />
        <AppText color={colors.danger}>Admins only.</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <Stack.Screen options={{ headerShown: true, title: 'Admin' }} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="title">Admin hub</AppText>
        <AppText muted>
          Publish media, manage members, and moderate content.
        </AppText>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : error ? (
          <AppText color={colors.danger}>Could not load dashboard.</AppText>
        ) : data ? (
          <View style={styles.stats}>
            <Stat label="Members" value={String(data.memberCount)} />
            <Stat label="Active" value={String(data.activeMemberCount)} />
            <Stat label="Pending" value={String(data.pendingMemberCount)} />
            <Stat
              label="RSVPs (7d)"
              value={String(data.engagement.rsvps7d)}
            />
            <Stat
              label="Prayers (7d)"
              value={String(data.engagement.prayers7d)}
            />
            <Stat
              label="Reactions (7d)"
              value={String(data.engagement.reactions7d)}
            />
          </View>
        ) : null}

        {data && data.upcomingEvents.length > 0 ? (
          <View style={styles.section}>
            <AppText variant="heading">Upcoming events</AppText>
            {data.upcomingEvents.map((ev) => (
              <Link
                key={ev.id}
                href={`/events/${ev.id}` as Href}
                asChild
              >
                <Pressable style={styles.row}>
                  <AppText variant="bodyStrong">{ev.title}</AppText>
                  <AppText variant="caption" muted>
                    {new Date(ev.starts_at).toLocaleString()}
                  </AppText>
                </Pressable>
              </Link>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <AppText variant="heading">Publish</AppText>
          <Link href={'/admin/media' as Href} asChild>
            <Button label="Sermons & media" />
          </Link>
          <Link href={'/admin/albums' as Href} asChild>
            <Button label="Photo albums" variant="secondary" />
          </Link>
          <Link href={'/events/create' as Href} asChild>
            <Button label="New event" variant="ghost" />
          </Link>
          <Link href={'/announcements/create' as Href} asChild>
            <Button label="New announcement" variant="ghost" />
          </Link>
        </View>

        <View style={styles.section}>
          <AppText variant="heading">People & safety</AppText>
          <Link href={'/admin/members' as Href} asChild>
            <Button label="Roles & upload access" />
          </Link>
          <Link href={'/admin/moderation' as Href} asChild>
            <Button label="Moderation" variant="secondary" />
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="heading">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loader: {
    marginVertical: spacing.lg,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    width: '31%',
    minWidth: 96,
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  row: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
