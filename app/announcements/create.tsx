import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useCreateAnnouncement } from '@/features/communication/hooks/useAnnouncements';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { colors, spacing } from '@/constants/theme';

export default function CreateAnnouncementScreen() {
  const { profile, user } = useAuth();
  const router = useRouter();
  const create = useCreateAnnouncement();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const profileId = profile?.id ?? user?.id;
  const isAdmin = profile?.role === 'admin';

  async function onSubmit() {
    setError(null);
    if (!isAdmin || !profileId) {
      setError('Only admins can publish announcements.');
      return;
    }
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    try {
      await create.mutateAsync({
        title,
        body,
        authorId: profileId,
      });
      router.replace('/(tabs)' as Href);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish.');
    }
  }

  if (!isAdmin) {
    return (
      <Screen>
        <AppText color={colors.danger}>Admins only.</AppText>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="title">New announcement</AppText>
        <AppText muted>
          Posted to the home feed. Members can react and comment.
        </AppText>
        <TextField label="Title" value={title} onChangeText={setTitle} />
        <TextField
          label="Body"
          value={body}
          onChangeText={setBody}
          multiline
          style={styles.body}
        />
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button label="Publish" loading={create.isPending} onPress={onSubmit} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  body: {
    minHeight: 140,
    textAlignVertical: 'top',
  },
});
