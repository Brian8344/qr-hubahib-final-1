
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import {
  getProfile,
  updateProfile,
  type Profile,
} from '@/lib/profile';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [editing, setEditing] = useState(false);

  const [fullName, setFullName] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [profileError, setProfileError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [feedbackType, setFeedbackType] = useState<
    'success' | 'error' | ''
  >('');

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoadingProfile(false);
      return;
    }

    setLoadingProfile(true);
    setProfileError('');

    try {
      const result = await getProfile(user.id);

      if (!result) {
        setProfileError(
          'Your profile could not be found. Please try again.'
        );
        return;
      }

      setProfile(result);
      setFullName(result.full_name ?? '');
      setSchoolId(result.school_id ?? '');
    } catch {
      setProfileError(
        'Unable to load your profile. Check your connection and try again.'
      );
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile])
  );

  function startEditing() {
    setFullName(profile?.full_name ?? '');
    setSchoolId(profile?.school_id ?? '');
    setFeedback('');
    setFeedbackType('');
    setEditing(true);
  }

  function cancelEditing() {
    setFullName(profile?.full_name ?? '');
    setSchoolId(profile?.school_id ?? '');
    setFeedback('');
    setFeedbackType('');
    setEditing(false);
  }

  async function handleSave() {
    if (!user || !profile) {
      setFeedback('Your profile is unavailable. Reload and try again.');
      setFeedbackType('error');
      return;
    }

    const cleanName = fullName.trim();
    const cleanSchoolId = schoolId.trim();

    if (!cleanName) {
      setFeedback('Please enter your full name.');
      setFeedbackType('error');
      return;
    }

    if (cleanName.length > 100) {
      setFeedback('Full name cannot exceed 100 characters.');
      setFeedbackType('error');
      return;
    }

    if (!cleanSchoolId) {
      setFeedback('Please enter your school ID.');
      setFeedbackType('error');
      return;
    }

    if (cleanSchoolId.length > 50) {
      setFeedback('School ID cannot exceed 50 characters.');
      setFeedbackType('error');
      return;
    }

    setSaving(true);
    setFeedback('');
    setFeedbackType('');

    try {
      const result = await updateProfile(user.id, {
        full_name: cleanName,
        school_id: cleanSchoolId,
      });

      if (result.error) {
        setFeedback(result.error);
        setFeedbackType('error');
        return;
      }

      setProfile({
        ...profile,
        full_name: cleanName,
        school_id: cleanSchoolId,
      });

      setFullName(cleanName);
      setSchoolId(cleanSchoolId);
      setEditing(false);
      setFeedback('Your profile was updated successfully.');
      setFeedbackType('success');
    } catch {
      setFeedback(
        'Unable to save your changes. Check your connection and try again.'
      );
      setFeedbackType('error');
    } finally {
      setSaving(false);
    }
  }

  async function performSignOut() {
    setSigningOut(true);

    try {
      const { error } = await signOut();

      if (error) {
        throw error;
      }

      router.replace('/login');
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to sign out. Please try again.';

      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.alert(message);
        }
      } else {
        Alert.alert('Sign Out Failed', message);
      }
    } finally {
      setSigningOut(false);
    }
  }

  function handleSignOut() {
    if (Platform.OS === 'web') {
      const confirmed =
        typeof window !== 'undefined' &&
        window.confirm('Are you sure you want to sign out?');

      if (confirmed) {
        void performSignOut();
      }

      return;
    }

    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => void performSignOut(),
        },
      ]
    );
  }

  const role = profile?.role ?? 'student';
  const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);

  const displayName =
    profile?.full_name?.trim() ||
    user?.user_metadata?.full_name ||
    'Campus User';

  const schoolIdDisplay =
    profile?.school_id ||
    'Not provided';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageHeader}>
        <Text style={styles.eyebrow}>ACCOUNT & SECURITY</Text>

        <Text style={styles.pageTitle}>My Profile</Text>

        <Text style={styles.pageSubtitle}>
          View and update your personal account information.
        </Text>
      </View>

      <View style={styles.heroCard}>
        <View style={styles.heroTop}>
          <View style={styles.avatar}>
            <Ionicons
              name="person"
              size={36}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.accountBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.accountBadgeText}>ACCOUNT</Text>
          </View>
        </View>

        <Text style={styles.name}>
          {loadingProfile ? 'Loading profile...' : displayName}
        </Text>

        <Text style={styles.heroEmail}>
          {user?.email ?? 'No email available'}
        </Text>

        <View style={styles.roleBadge}>
          <Ionicons
            name="shield-checkmark-outline"
            size={15}
            color="#67E8F9"
          />

          <Text style={styles.roleText}>
            {loadingProfile ? 'Verifying role...' : roleLabel}
          </Text>
        </View>

        <View style={styles.heroDecoration} />
      </View>

      <View style={styles.sectionHeading}>
        <View style={styles.sectionIcon}>
          <Ionicons
            name="person-circle-outline"
            size={21}
            color={COLORS.primary}
          />
        </View>

        <View style={styles.sectionHeadingText}>
          <Text style={styles.sectionTitle}>
            Personal Information
          </Text>

          <Text style={styles.sectionSubtitle}>
            Your registered account details
          </Text>
        </View>
      </View>

      {loadingProfile ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator
            size="large"
            color={COLORS.primary}
          />
          <Text style={styles.mutedText}>
            Loading your information...
          </Text>
        </View>
      ) : profileError ? (
        <View style={styles.errorCard}>
          <Ionicons
            name="alert-circle-outline"
            size={25}
            color={COLORS.danger}
          />

          <Text style={styles.errorText}>{profileError}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => void loadProfile()}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : profile ? (
        <View style={styles.infoCard}>
          {editing ? (
            <>
              <Text style={styles.inputLabel}>Full Name</Text>

              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="words"
                maxLength={100}
                editable={!saving}
                returnKeyType="next"
                accessibilityLabel="Full name"
              />

              <Text style={styles.inputLabel}>School ID</Text>

              <TextInput
                style={styles.input}
                value={schoolId}
                onChangeText={setSchoolId}
                placeholder="Enter your school ID"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="characters"
                maxLength={50}
                editable={!saving}
                returnKeyType="done"
                accessibilityLabel="School ID"
              />

              <Text style={styles.inputLabel}>Email Address</Text>

              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {profile.email || user?.email || 'Not available'}
                </Text>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={COLORS.muted}
                />
              </View>

              <Text style={styles.inputLabel}>Account Role</Text>

              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>
                  {roleLabel}
                </Text>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={COLORS.muted}
                />
              </View>

              {feedback ? (
                <View
                  style={[
                    styles.feedbackBox,
                    feedbackType === 'success'
                      ? styles.successBox
                      : styles.errorBox,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      feedbackType === 'success'
                        ? styles.successText
                        : styles.errorText,
                    ]}
                  >
                    {feedback}
                  </Text>
                </View>
              ) : null}

              <View style={styles.actionButtons}>
                <View style={styles.actionButton}>
                  <AppButton
                    title={saving ? 'Saving...' : 'Save Changes'}
                    icon="checkmark-circle-outline"
                    theme="primary"
                    loading={saving}
                    disabled={saving}
                    onPress={() => void handleSave()}
                  />
                </View>

                <View style={styles.actionButton}>
                  <AppButton
                    title="Cancel"
                    icon="close-circle-outline"
                    disabled={saving}
                    onPress={cancelEditing}
                  />
                </View>
              </View>
            </>
          ) : (
            <>
              <InfoRow
                icon="mail-outline"
                label="Email Address"
                value={profile.email || user?.email || 'Not available'}
              />

              <View style={styles.separator} />

              <InfoRow
                icon="person-outline"
                label="Full Name"
                value={profile.full_name || 'Not provided'}
              />

              <View style={styles.separator} />

              <InfoRow
                icon="shield-checkmark-outline"
                label="Account Role"
                value={roleLabel}
              />

              <View style={styles.separator} />

              <InfoRow
                icon="card-outline"
                label="School ID"
                value={schoolIdDisplay}
                compact
              />

              {feedback ? (
                <View
                  style={[
                    styles.feedbackBox,
                    feedbackType === 'success'
                      ? styles.successBox
                      : styles.errorBox,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackText,
                      feedbackType === 'success'
                        ? styles.successText
                        : styles.errorText,
                    ]}
                  >
                    {feedback}
                  </Text>
                </View>
              ) : null}

              <View style={styles.editButton}>
                <AppButton
                  title="Edit Profile"
                  icon="create-outline"
                  theme="primary"
                  onPress={startEditing}
                />
              </View>
            </>
          )}
        </View>
      ) : null}

      <View style={styles.securityNote}>
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={COLORS.accent}
        />

        <View style={styles.securityTextContainer}>
          <Text style={styles.securityTitle}>Account Security</Text>

          <Text style={styles.securityDescription}>
            Your email and account role cannot be changed here.
            Your access is controlled by your registered role and
            database permissions.
          </Text>
        </View>
      </View>

      <View style={styles.signOutSection}>
        <Text style={styles.signOutHeading}>SESSION</Text>

        <AppButton
          title={signingOut ? 'Signing Out...' : 'Sign Out'}
          icon="log-out-outline"
          loading={signingOut}
          disabled={signingOut || saving}
          onPress={handleSignOut}
        />
      </View>

      <Text style={styles.footer}>
        CAMPUS TECHNOLOGY · QR ATTENDANCE SYSTEM
      </Text>
    </ScrollView>
  );
}

type InfoRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  compact?: boolean;
};

function InfoRow({
  icon,
  label,
  value,
  compact,
}: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons
          name={icon}
          size={21}
          color={COLORS.primary}
        />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>

        <Text
          selectable
          style={[
            styles.infoValue,
            compact && styles.compactValue,
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 35,
  },
  pageHeader: {
    marginBottom: 20,
  },
  eyebrow: {
    color: COLORS.accentDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.7,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.6,
  },
  pageSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  heroCard: {
    backgroundColor: COLORS.darkBackground,
    borderRadius: 20,
    padding: 22,
    overflow: 'hidden',
    marginBottom: 26,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 66,
    height: 66,
    borderRadius: 19,
    backgroundColor: COLORS.darkSurface,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: COLORS.darkSurface,
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.accent,
  },
  accountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.darkText,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginTop: 19,
  },
  heroEmail: {
    color: COLORS.darkMuted,
    fontSize: 13,
    marginTop: 5,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.darkSurface,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  roleText: {
    color: '#67E8F9',
    fontSize: 12,
    fontWeight: '700',
  },
  heroDecoration: {
    position: 'absolute',
    width: 125,
    height: 125,
    borderRadius: 63,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    right: -60,
    bottom: -70,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 14,
  },
  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 15,
    paddingVertical: 5,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 5,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  compactValue: {
    fontSize: 11,
    lineHeight: 17,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  loadingCard: {
    backgroundColor: COLORS.card,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginBottom: 18,
  },
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
  errorCard: {
    backgroundColor: COLORS.dangerLight,
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    gap: 10,
    marginBottom: 18,
  },
  errorText: {
    color: COLORS.danger,
    textAlign: 'center',
    fontSize: 13,
  },
  retryText: {
    color: COLORS.primary,
    fontWeight: '800',
    padding: 5,
  },
  inputLabel: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 15,
    marginBottom: 7,
  },
  input: {
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 48,
  },
  readOnlyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: '#F0F1F5',
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 48,
  },
  readOnlyText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  actionButtons: {
    marginTop: 20,
    gap: 2,
  },
  actionButton: {
    width: '100%',
  },
  editButton: {
    marginTop: 18,
  },
  feedbackBox: {
    padding: 12,
    borderRadius: 10,
    marginTop: 16,
  },
  successBox: {
    backgroundColor: COLORS.successLight,
  },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
  },
  feedbackText: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  successText: {
    color: COLORS.success,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    backgroundColor: COLORS.darkBackground,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    marginBottom: 25,
  },
  securityTextContainer: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  securityDescription: {
    fontSize: 12,
    lineHeight: 19,
    color: COLORS.darkMuted,
  },
  signOutSection: {
    marginBottom: 16,
  },
  signOutHeading: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: COLORS.textSecondary,
    marginBottom: 12,
  },
  footer: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    color: COLORS.muted,
    marginTop: 5,
  },
});
