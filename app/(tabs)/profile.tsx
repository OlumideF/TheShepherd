import { useEffect, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  canAccessAdminHub,
  canPublishMedia,
} from '@/features/admin/utils/permissions';
import { PrivacyToggles } from '@/features/members/components/PrivacyToggles';
import { useHousehold } from '@/features/members/hooks/useHousehold';
import { NotificationPrefsPanel } from '@/features/communication/components/NotificationPrefsPanel';
import { supabase } from '@/lib/supabase/client';
import { Link, type Href } from 'expo-router';

export default function ProfileScreen() {
  const { profile, user, signOut, refreshProfile, isConfigured } = useAuth();
  const {
    household,
    members,
    createHousehold,
    joinHousehold,
    leaveHousehold,
  } = useHousehold();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [firstName, setFirstName] = useState(profile?.first_name ?? '');
  const [lastName, setLastName] = useState(profile?.last_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [directoryVisible, setDirectoryVisible] = useState(
    profile?.directory_visible ?? false,
  );
  const [showEmail, setShowEmail] = useState(profile?.show_email ?? false);
  const [showPhone, setShowPhone] = useState(profile?.show_phone ?? false);
  const [showPhoto, setShowPhoto] = useState(profile?.show_photo ?? true);

  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDisplayName(profile?.display_name ?? '');
    setFirstName(profile?.first_name ?? '');
    setLastName(profile?.last_name ?? '');
    setPhone(profile?.phone ?? '');
    setDirectoryVisible(profile?.directory_visible ?? false);
    setShowEmail(profile?.show_email ?? false);
    setShowPhone(profile?.show_phone ?? false);
    setShowPhoto(profile?.show_photo ?? true);
  }, [profile]);

  async function onSave() {
    if (!user?.id) return;
    setSaving(true);
    setError(null);
    setMessage(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        display_name: displayName.trim() || null,
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
        phone: phone.trim() || null,
        directory_visible: directoryVisible,
        show_email: showEmail,
        show_phone: showPhone,
        show_photo: showPhoto,
      })
      .eq('id', user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    setMessage('Profile saved.');
  }

  async function onCreateHousehold() {
    setError(null);
    try {
      await createHousehold.mutateAsync(householdName.trim() || 'My household');
      setHouseholdName('');
      setMessage('Household created.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create household.');
    }
  }

  async function onJoinHousehold() {
    setError(null);
    try {
      await joinHousehold.mutateAsync(inviteCode.trim());
      setInviteCode('');
      setMessage('Joined household.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join household.');
    }
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <AppText variant="title">Your profile</AppText>
          <AppText muted>{user?.email ?? 'Signed in'}</AppText>
        </View>

        <View style={styles.meta}>
          <MetaChip label="Role" value={profile?.role ?? '—'} />
          <MetaChip
            label="Membership"
            value={profile?.membership_status ?? '—'}
          />
        </View>

        {(canAccessAdminHub(profile) || canPublishMedia(profile)) && (
          <Section title="Admin tools">
            {canAccessAdminHub(profile) ? (
              <Link href={'/admin' as Href} asChild>
                <Button label="Open admin hub" />
              </Link>
            ) : null}
            {canPublishMedia(profile) ? (
              <Link href={'/admin/media' as Href} asChild>
                <Button
                  label="Publish media"
                  variant={canAccessAdminHub(profile) ? 'secondary' : 'primary'}
                />
              </Link>
            ) : null}
          </Section>
        )}

        <Section title="Basics">
          <TextField
            label="Display name"
            value={displayName}
            onChangeText={setDisplayName}
          />
          <TextField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
          />
          <TextField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
          />
          <TextField
            label="Phone"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </Section>

        <Section title="Directory privacy">
          <PrivacyToggles
            directoryVisible={directoryVisible}
            showEmail={showEmail}
            showPhone={showPhone}
            showPhoto={showPhoto}
            onChange={(next) => {
              setDirectoryVisible(next.directoryVisible);
              setShowEmail(next.showEmail);
              setShowPhone(next.showPhone);
              setShowPhoto(next.showPhoto);
            }}
          />
        </Section>

        {user?.id ? (
          <Section title="Notifications">
            <NotificationPrefsPanel profileId={user.id} />
          </Section>
        ) : null}

        <Section title="Household">
          {household ? (
            <View style={styles.householdCard}>
              <AppText variant="bodyStrong">
                {household.name || 'Household'}
              </AppText>
              <AppText variant="caption" muted>
                Invite code: {household.invite_code}
              </AppText>
              <AppText muted>
                {members.length} member{members.length === 1 ? '' : 's'}
              </AppText>
              {members.map((m) => (
                <AppText key={m.id} variant="caption">
                  {m.display_name || m.email || m.id}
                </AppText>
              ))}
              <Button
                label="Leave household"
                variant="ghost"
                loading={leaveHousehold.isPending}
                onPress={() => leaveHousehold.mutate()}
              />
            </View>
          ) : (
            <View style={styles.householdActions}>
              <TextField
                label="New household name"
                value={householdName}
                onChangeText={setHouseholdName}
              />
              <Button
                label="Create household"
                variant="secondary"
                loading={createHousehold.isPending}
                onPress={onCreateHousehold}
              />
              <TextField
                label="Join with invite code"
                autoCapitalize="characters"
                value={inviteCode}
                onChangeText={setInviteCode}
              />
              <Button
                label="Join household"
                variant="secondary"
                loading={joinHousehold.isPending}
                disabled={!inviteCode.trim()}
                onPress={onJoinHousehold}
              />
            </View>
          )}
        </Section>

        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        {message ? <AppText color={colors.success}>{message}</AppText> : null}

        <Button
          label="Save changes"
          loading={saving}
          disabled={!isConfigured}
          onPress={onSave}
        />
        <Button label="Sign out" variant="ghost" onPress={signOut} />
      </ScrollView>
    </Screen>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </View>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.chip}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="bodyStrong">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flex: 1,
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
  },
  section: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  householdCard: {
    backgroundColor: colors.canvasElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: spacing.xs,
  },
  householdActions: {
    gap: spacing.md,
  },
});
