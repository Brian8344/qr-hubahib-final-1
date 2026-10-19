
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
        behavior={
          Platform.OS === 'ios' ? 'padding' : 'height'
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios' ? 0 : 20
        }
      >
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.headerContainer}>
              <Header title="QR Attendance" />
            </View>

            <Text style={styles.title}>
              Create Account
            </Text>

            <Text style={styles.subtitle}>
              Register to start recording attendance
            </Text>

            {success ? (
              <View style={styles.successContainer}>
                <Text style={styles.successTitle}>
                  Check your email!
                </Text>

                <Text style={styles.successText}>
                  We sent a confirmation link to{' '}
                  {email.trim()}. Click the link to verify
                  your account, then come back and sign in.
                </Text>

                <Link
                  href="/login"
                  style={styles.link}
                >
                  Back to Sign In
                </Link>
              </View>
            ) : (
              <View style={styles.form}>
                {/* FULL NAME */}
                <Text style={styles.label}>
                  Full Name
                </Text>

                <TextInput
                  style={styles.input}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Jane Doe"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!loading}
                  maxLength={100}
                  accessibilityLabel="Full Name"
                />

                {/* ACCOUNT TYPE */}
                <Text style={styles.label}>
                  Account Type
                </Text>

                <View
                  style={styles.roleOptions}
                  accessibilityRole="radiogroup"
                >
                  {/* STUDENT */}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel="Student"
                    accessibilityState={{
                      selected: accountRole === 'student',
                    }}
                    disabled={loading}
                    onPress={() =>
                      setAccountRole('student')
                    }
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

                  {/* TEACHER */}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel="Teacher"
                    accessibilityState={{
                      selected: accountRole === 'teacher',
                    }}
                    disabled={loading}
                    onPress={() =>
                      setAccountRole('teacher')
                    }
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

                {/* SCHOOL ID */}
                <Text style={styles.label}>
                  School ID
                </Text>

                <TextInput
                  style={styles.input}
                  value={schoolId}
                  onChangeText={setSchoolId}
                  placeholder="Enter your school ID"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  autoCapitalize="characters"
                  autoCorrect={false}
                  editable={!loading}
                  maxLength={50}
                  accessibilityLabel="School ID"
                />

                {/* EMAIL */}
                <Text style={styles.label}>
                  Email
                </Text>

                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your.email@school.edu"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  editable={!loading}
                  accessibilityLabel="Email"
                />

                {/* PASSWORD */}
                <Text style={styles.label}>
                  Password
                </Text>

                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                  accessibilityLabel="Password"
                />

                {/* CONFIRM PASSWORD */}
                <Text style={styles.label}>
                  Confirm Password
                </Text>

                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter your password"
                  placeholderTextColor={
                    COLORS.textSecondary
                  }
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                  accessibilityLabel="Confirm Password"
                  onSubmitEditing={handleRegister}
                  returnKeyType="done"
                />

                {/* ERROR MESSAGE */}
                {error ? (
                  <Text
                    style={styles.error}
                    accessibilityRole="alert"
                  >
                    {error}
                  </Text>
                ) : null}

                {/* SIGN UP BUTTON */}
                {loading ? (
                  <ActivityIndicator
                    size="large"
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
            )}

            {!success && (
              <Link
                href="/login"
                style={styles.link}
              >
                Already have an account? Sign In
              </Link>
            )}
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
    paddingHorizontal: 24,
    paddingBottom: 40,
  },

  headerContainer: {
    alignItems: 'flex-start',
    marginTop: 20,
    marginBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'left',
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 15,
    lineHeight: 21,
    color: COLORS.textSecondary,
    textAlign: 'left',
    marginBottom: 32,
  },

  form: {
    marginBottom: 24,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 6,
    marginTop: 10,
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
    backgroundColor: COLORS.card,
  },

  roleOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F1E8FA',
  },

  roleOptionText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },

  roleOptionTextSelected: {
    color: COLORS.primary,
  },

  input: {
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
  },

  error: {
    fontSize: 14,
    color: COLORS.danger,
    textAlign: 'left',
    marginTop: 12,
    marginBottom: 4,
  },

  loader: {
    marginVertical: 16,
  },

  link: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'left',
    fontWeight: '600',
  },

  successContainer: {
    alignItems: 'flex-start',
    marginBottom: 24,
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  successTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },

  successText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 16,
  },
});
