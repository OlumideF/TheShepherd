import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Link, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { AnnouncementCard } from '@/features/communication/components/AnnouncementCard';
import { useAnnouncements } from '@/features/communication/hooks/useAnnouncements';
import { useNotifications } from '@/features/communication/hooks/useNotifications';
import { usePushRegistration } from '@/features/communication/hooks/usePushRegistration';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  canAccessAdminHub,
  canPublishMedia,
} from '@/features/admin/utils/permissions';
import { brand } from '@/constants/brand';
import { colors, radii, spacing } from '@/constants/theme';

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const profileId = profile?.id ?? user?.id;
  const authEmail = user?.email ?? profile?.email;
  const isAdmin = canAccessAdminHub(profile, authEmail);
  const canBroadcast =
    isAdmin || profile?.role === 'group_leader';
  const canPublish = canPublishMedia(profile, authEmail);

  usePushRegistration(profileId);

  const { data: announcements = [], isLoading, error } = useAnnouncements();
  const { data: notifications = [] } = useNotifications(profileId);
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  const name =
    profile?.display_name ||
    profile?.first_name ||
    user?.email?.split('@')[0] ||
    'friend';

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <BrandMark size="sm" />
          <AppText muted>Welcome back, {name}.</AppText>
          <View style={styles.heroActions}>
            <Link href={'/notifications' as Href} asChild>
              <Button
                label={
                  unreadCount > 0
                    ? `Inbox (${unreadCount})`
                    : 'Inbox'
                }
                variant="ghost"
              />
            </Link>
            <Link href={'/prayer' as Href} asChild>
              <Button label="Prayer wall" variant="secondary" />
            </Link>
          </View>
          {(isAdmin || canBroadcast || canPublish) && (
            <View style={styles.heroActions}>
              {isAdmin ? (
                <Link href={'/admin' as Href} asChild>
                  <Button label="Admin hub" />
                </Link>
              ) : null}
              {isAdmin || canBroadcast ? (
                <Link href={'/announcements/create' as Href} asChild>
                  <Button
                    label="New announcement"
                    variant={isAdmin ? 'secondary' : 'primary'}
                  />
                </Link>
              ) : null}
              {canBroadcast ? (
                <Link href={'/broadcasts/create' as Href} asChild>
                  <Button label="Broadcast" variant="ghost" />
                </Link>
              ) : null}
              {canPublish && !isAdmin ? (
                <Link href={'/admin/media' as Href} asChild>
                  <Button label="Publish media" variant="secondary" />
                </Link>
              ) : null}
            </View>
          )}
        </View>

        <AppText variant="title">Announcements</AppText>
        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : error ? (
          <AppText color={colors.danger}>
            Could not load announcements.
          </AppText>
        ) : announcements.length === 0 ? (
          <View style={styles.empty}>
            <AppText muted>
              No announcements yet. Check back after Sunday, or watch live on
              YouTube ({brand.liveSchedule.label}).
            </AppText>
            <SocialLinks />
          </View>
        ) : (
          <View style={styles.feed}>
            {announcements.map((item) => (
              <AnnouncementCard
                key={item.id}
                announcement={item}
                profileId={profileId}
              />
            ))}
          </View>
        )}

        <View style={styles.footerLinks}>
          <Link href="/(tabs)/media" asChild>
            <Pressable>
              <AppText color={colors.accent} variant="bodyStrong">
                Watch live / sermons →
              </AppText>
            </Pressable>
          </Link>
          <Link href="/(tabs)/events" asChild>
            <Pressable>
              <AppText color={colors.accent} variant="bodyStrong">
                Events calendar →
              </AppText>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  loader: {
    marginVertical: spacing.xl,
  },
  feed: {
    gap: spacing.md,
  },
  empty: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  footerLinks: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
