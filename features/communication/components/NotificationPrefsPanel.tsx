import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/features/communication/hooks/useNotifications';
import { colors, radii, spacing } from '@/constants/theme';

type NotificationPrefsPanelProps = {
  profileId: string;
};

const ROWS: {
  key: 'announcements' | 'events' | 'broadcasts' | 'prayer';
  label: string;
  description: string;
}[] = [
  {
    key: 'announcements',
    label: 'Announcements',
    description: 'Church-wide news on the home feed.',
  },
  {
    key: 'events',
    label: 'Event reminders',
    description: 'RSVP reminders before services and events.',
  },
  {
    key: 'broadcasts',
    label: 'Group broadcasts',
    description: 'Messages from admins and group leaders.',
  },
  {
    key: 'prayer',
    label: 'Prayer wall',
    description: 'When someone posts a public prayer request.',
  },
];

export function NotificationPrefsPanel({ profileId }: NotificationPrefsPanelProps) {
  const { data: prefs, isLoading } = useNotificationPreferences(profileId);
  const update = useUpdateNotificationPreferences();

  if (isLoading || !prefs) {
    return (
      <AppText muted variant="caption">
        Loading notification preferences…
      </AppText>
    );
  }

  return (
    <View style={styles.wrap}>
      {ROWS.map((row) => {
        const value = prefs[row.key];
        return (
          <Pressable
            key={row.key}
            accessibilityRole="switch"
            accessibilityState={{ checked: value }}
            accessibilityLabel={row.label}
            onPress={() =>
              update.mutate({
                profileId,
                patch: { [row.key]: !value },
              })
            }
            style={styles.row}
          >
            <View style={styles.rowText}>
              <AppText variant="bodyStrong">{row.label}</AppText>
              <AppText variant="caption" muted>
                {row.description}
              </AppText>
            </View>
            <Switch
              value={value}
              onValueChange={(next) =>
                update.mutate({
                  profileId,
                  patch: { [row.key]: next },
                })
              }
              trackColor={{ false: colors.line, true: colors.accent }}
              thumbColor={colors.canvasElevated}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.canvasElevated,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
