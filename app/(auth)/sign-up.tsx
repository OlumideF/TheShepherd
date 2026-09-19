import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Link, Redirect } from 'expo-router';

import { AppText } from '@/components/ui/AppText';
import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function SignUpScreen() {
  const { signUpWithEmail, session, isLoading } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && session) {
    return <Redirect href="/(tabs)" />;
  }

  async function onSubmit() {
    setError(null);
    setMessage(null);
    setSubmitting(true);
    const result = await signUpWithEmail(email.trim(), password, displayName.trim());
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setMessage('Check your email to verify your account, then sign in.');
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <View style={styles.hero}>
          <BrandMark size="sm" showAppName={false} />
          <AppText variant="title">Create your profile</AppText>
          <AppText muted>Sign up with your email address.</AppText>
        </View>

        <View style={styles.form}>
          <TextField
            label="Display name"
            autoComplete="name"
            textContentType="name"
            value={displayName}
            onChangeText={setDisplayName}
          />
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
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            onChangeText={setPassword}
          />
          {error ? <AppText color={colors.danger}>{error}</AppText> : null}
          {message ? <AppText color={colors.success}>{message}</AppText> : null}
          <Button
            label="Create account"
            loading={submitting}
            disabled={!displayName || !email || password.length < 6}
            onPress={onSubmit}
          />
        </View>

        <Link href="/(auth)/sign-in" asChild>
          <Button label="Back to sign in" variant="ghost" />
        </Link>
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
  },
  form: {
    gap: spacing.md,
  },
});
