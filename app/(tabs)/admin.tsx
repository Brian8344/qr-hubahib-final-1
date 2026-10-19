
import { StyleSheet, Text, View } from 'react-native';

import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { useEffect, useState } from 'react';

export default function AdminScreen() {
  const { user, loading: authLoading } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (authLoading) return;

      if (!user) {
        if (active) {
          setError('Please log in to continue.');
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError('');

      try {
        const profile = await getProfile(user.id);

        if (!active) return;

        if (!profile) {
          setError(
            'Your profile could not be found. Please contact the administrator.'
          );
        } else {
          setRole(profile.role);
        }
      } catch {
        if (active) {
          setError('Unable to load your profile. Please try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  return (
    <View style={styles.container}>
      <Header title="Administrator" />

      {loading ? (
        <Text style={styles.message}>Loading administrator dashboard...</Text>
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : role !== 'admin' ? (
        <View style={styles.card}>
          <Text style={styles.title}>Access Restricted</Text>
          <Text style={styles.message}>
            This page is only available to authorized administrators.
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.title}>Admin Dashboard</Text>

          <Text style={styles.message}>
            Welcome to the administrator dashboard.
          </Text>

          <Text style={styles.pending}>
            User management, event management, attendance
            corrections, and reports will be added in the
            next implementation steps.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: COLORS.background,
  },
  card: {
    marginTop: 24,
    padding: 20,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  message: {
    marginTop: 16,
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  error: {
    marginTop: 16,
    fontSize: 15,
    color: '#DC2626',
  },
  pending: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
});
