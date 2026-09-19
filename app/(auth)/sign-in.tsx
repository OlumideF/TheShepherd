import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Link, Redirect } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function SignInScreen() {
  const { signInWithEmail, session, isConfigured, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && session) {
    return <Redirect href="/(tabs)" />;
  }

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    const result = await signInWithEmail(email.trim(), password);
    setSubmitting(false);
    if (result.error) setError(result.error);
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <BrandMark size="lg" />
          <AppText muted style={styles.subtitle}>
            Stay connected with your congregation.
          </AppText>
        </View>

        {!isConfigured ? (
          <View style={styles.banner}>
            <AppText variant="bodyStrong">Setup required</AppText>
            <AppText muted>
              Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to
              `.env`, then apply the Phase 1 migration.
            </AppText>
          </View>
        ) : null}

        <View style={styles.form}>
          <TextField
            label="Email"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Password"
            secureTextEntry
            autoComplete="password"
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />
          {error ? <AppText color={colors.danger}>{error}</AppText> : null}
          <Button
            label="Sign in"
            loading={submitting}
            disabled={!email || !password}
            onPress={onSubmit}
          />
        </View>

        <View style={styles.footer}>
          <AppText muted>New here?</AppText>
          <Link href="/(auth)/sign-up" asChild>
            <Button label="Create an account" variant="ghost" />
          </Link>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  hero: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  subtitle: {
    maxWidth: 320,
  },
  form: {
    gap: spacing.md,
  },
  footer: {
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  banner: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
});
