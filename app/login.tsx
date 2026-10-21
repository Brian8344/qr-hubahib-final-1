import { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signIn } from '@/lib/auth';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      const { error: authError } = await signIn(
        email.trim(),
        password
      );

      if (authError) {
        setError(authError.message);
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            <View style={styles.pageHeading}>
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Sign in to record your attendance
              </Text>
            </View>

            <View style={styles.formCard}>
              <Text style={styles.cardTitle}>Sign In</Text>
              <Text style={styles.cardDescription}>
                Enter your account details to continue.
              </Text>

              <View style={styles.form}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Enter your email address"
                  placeholderTextColor={COLORS.textSecondary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                  accessibilityLabel="Email"
                  returnKeyType="next"
                />

                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textSecondary}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                  accessibilityLabel="Password"
                  onSubmitEditing={handleLogin}
                  returnKeyType="done"
                />

                {error ? (
                  <Text
                    style={styles.error}
                    accessibilityRole="alert"
                  >
                    {error}
                  </Text>
                ) : null}

                <View style={styles.buttonWrapper}>
                  {loading ? (
                    <ActivityIndicator
                      size="small"
                      color={COLORS.primary}
                      style={styles.loader}
                    />
                  ) : (
                    <AppButton
                      theme="primary"
                      title="Sign In"
                      icon="log-in-outline"
                      onPress={handleLogin}
                    />
                  )}
                </View>
              </View>

              <View style={styles.accountLinkContainer}>
                <Text style={styles.accountText}>
                  Don&apos;t have an account?
                </Text>
                <Link href="/register" style={styles.link}>
                  Sign Up
                </Link>
              </View>
            </View>

            <Text style={styles.footerText}>
              QR Attendance System
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: 'center',
  },
  headerContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 28,
  },
  pageHeading: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 7,
    marginTop: 12,
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  error: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.danger,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonWrapper: {
    width: 175,
    maxWidth: '100%',
    alignSelf: 'center',
    marginTop: 22,
  },
  loader: {
    marginVertical: 14,
  },
  accountLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 22,
    gap: 5,
  },
  accountText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  link: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '700',
  },
  footerText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 24,
  },
});