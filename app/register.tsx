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
  Pressable,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState('');
  const [accountRole, setAccountRole] = useState<
    'student' | 'teacher'
  >('student');
  const [schoolId, setSchoolId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedSchoolId = schoolId.trim();
    const trimmedEmail = email.trim();

    if (
      !trimmedName ||
      !trimmedSchoolId ||
      !trimmedEmail ||
      !password ||
      !confirmPassword
    ) {
      setError('All fields are required.');
      return;
    }

    if (trimmedName.length > 100) {
      setError('Full name cannot exceed 100 characters.');
      return;
    }

    if (trimmedSchoolId.length > 50) {
      setError('School ID cannot exceed 50 characters.');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    Keyboard.dismiss();

    try {
      const { data, error: authError } = await signUp(
        trimmedEmail,
        password,
        {
          full_name: trimmedName,
          role: accountRole,
          school_id: trimmedSchoolId,
        }
      );

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.session) {
        router.replace('/(tabs)');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(
        'An unexpected error occurred. Please try again.'
      );
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
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Register to start recording attendance
              </Text>
            </View>

            <View style={styles.formCard}>
              {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successIcon}>✓</Text>

                  <Text style={styles.successTitle}>
                    Check your email!
                  </Text>

                  <Text style={styles.successText}>
                    We sent a confirmation link to{' '}
                    {email.trim()}. Click the link to verify
                    your account, then come back and sign in.
                  </Text>

                  <View style={styles.buttonWrapper}>
                    <AppButton
                      theme="primary"
                      title="Back to Sign In"
                      icon="log-in-outline"
                      onPress={() => router.replace('/login')}
                    />
                  </View>
                </View>
              ) : (
                <>
                  <Text style={styles.cardTitle}>
                    Register
                  </Text>
                  <Text style={styles.cardDescription}>
                    Fill in your details to create an account.
                  </Text>

                  <View style={styles.form}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.input}
                      value={fullName}
                      onChangeText={setFullName}
                      placeholder="Enter your full name"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="words"
                      autoCorrect={false}
                      editable={!loading}
                      maxLength={100}
                      accessibilityLabel="Full Name"
                    />

                    <Text style={styles.label}>
                      Account Type
                    </Text>

                    <View
                      style={styles.roleOptions}
                      accessibilityRole="radiogroup"
                    >
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel="Student"
                        accessibilityState={{
                          selected: accountRole === 'student',
                        }}
                        disabled={loading}
                        onPress={() => setAccountRole('student')}
                        style={[
                          styles.roleOption,
                          accountRole === 'student' &&
                            styles.roleOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            accountRole === 'student' &&
                              styles.roleOptionTextSelected,
                          ]}
                        >
                          Student
                        </Text>
                      </Pressable>

                      <Pressable
                        accessibilityRole="radio"
                        accessibilityLabel="Teacher"
                        accessibilityState={{
                          selected: accountRole === 'teacher',
                        }}
                        disabled={loading}
                        onPress={() => setAccountRole('teacher')}
                        style={[
                          styles.roleOption,
                          accountRole === 'teacher' &&
                            styles.roleOptionSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleOptionText,
                            accountRole === 'teacher' &&
                              styles.roleOptionTextSelected,
                          ]}
                        >
                          Teacher
                        </Text>
                      </Pressable>
                    </View>

                    <Text style={styles.label}>School ID</Text>
                    <TextInput
                      style={styles.input}
                      value={schoolId}
                      onChangeText={setSchoolId}
                      placeholder="Enter your school ID"
                      placeholderTextColor={COLORS.textSecondary}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      editable={!loading}
                      maxLength={50}
                      accessibilityLabel="School ID"
                    />

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
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="At least 6 characters"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                      editable={!loading}
                      accessibilityLabel="Password"
                    />

                    <Text style={styles.label}>
                      Confirm Password
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Re-enter your password"
                      placeholderTextColor={COLORS.textSecondary}
                      secureTextEntry
                      autoCapitalize="none"
                      editable={!loading}
                      accessibilityLabel="Confirm Password"
                      onSubmitEditing={handleRegister}
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
                          title="Sign Up"
                          icon="person-add-outline"
                          onPress={handleRegister}
                        />
                      )}
                    </View>
                  </View>

                  <View style={styles.accountLinkContainer}>
                    <Text style={styles.accountText}>
                      Already have an account?
                    </Text>
                    <Link href="/login" style={styles.link}>
                      Sign In
                    </Link>
                  </View>
                </>
              )}
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headerContainer: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  pageHeading: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
    marginBottom: 22,
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
    maxWidth: 480,
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
    marginBottom: 16,
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
  roleOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 2,
  },
  roleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  roleOptionText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  roleOptionTextSelected: {
    color: COLORS.primary,
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  successIcon: {
    width: 48,
    height: 48,
    lineHeight: 48,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.successLight,
    color: COLORS.success,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 24,
  },
});