
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';
//new role
export async function changeUserRole(
  userId: string,
  newRole: 'student' | 'teacher' | 'admin'
) {
  const { error } = await supabase.rpc('admin_set_user_role', {
    p_user_id: userId,
    p_new_role: newRole,
  });

  if (error) {
    throw new Error(error.message);
  }
}
//new role
type Stats = {
  users: number;
  events: number;
  attendance: number;
  openEvents: number;
};

export default function AdminScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<Stats>({
    users: 0,
    events: 0,
    attendance: 0,
    openEvents: 0,
  });

  const loadDashboard = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setError('Please log in to continue.');
      setLoading(false);
      return;
    }

    setError('');

    try {
      const profile = await getProfile(user.id);
      setRole(profile?.role ?? null);

      if (!profile) {
        setError('Your profile could not be found.');
        return;
      }

      if (profile.role !== 'admin') return;

      const [usersResult, eventsResult, attendanceResult, openResult] =
        await Promise.all([
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('events').select('id', { count: 'exact', head: true }),
          supabase.from('attendance').select('id', { count: 'exact', head: true }),
          supabase
            .from('events')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'open'),
        ]);

      const firstError =
        usersResult.error ??
        eventsResult.error ??
        attendanceResult.error ??
        openResult.error;

      if (firstError) throw firstError;

      setStats({
        users: usersResult.count ?? 0,
        events: eventsResult.count ?? 0,
        attendance: attendanceResult.count ?? 0,
        openEvents: openResult.count ?? 0,
      });
    } catch (e) {
      console.error('Admin dashboard error:', e);
      setError('Could not load dashboard data. Check your Supabase permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const refresh = () => {
    setRefreshing(true);
    void loadDashboard();
  };

  if (authLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading administrator dashboard...</Text>
      </View>
    );
  }

  if (error || role !== 'admin') {
    return (
      <View style={styles.container}>
        <Header title="Administrator" />
        <View style={styles.notice}>
          <Ionicons name="shield-checkmark-outline" size={32} color={COLORS.primary} />
          <Text style={styles.cardTitle}>
            {role === 'admin' ? 'Dashboard unavailable' : 'Access Restricted'}
          </Text>
          <Text style={styles.muted}>
            {error || 'This page is only available to authorized administrators.'}
          </Text>
          <Pressable style={styles.primaryButton} onPress={refresh}>
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Administrator" subtitle="System overview and management" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="shield-checkmark" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.heroTitle}>Administrator Workspace</Text>
          <Text style={styles.heroText}>
            Manage accounts, events, and attendance from one place.
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            title="Total Users"
            value={stats.users}
            icon="people-outline"
            onPress={() => router.push('/users')}
          />
          <StatCard
            title="Total Events"
            value={stats.events}
            icon="calendar-outline"
            onPress={() => router.push('/events')}
          />
          <StatCard
            title="Attendance Records"
            value={stats.attendance}
            icon="clipboard-outline"
            onPress={() => router.push('/attendance')}
          />
          <StatCard
            title="Open Events"
            value={stats.openEvents}
            icon="radio-button-on-outline"
            onPress={() => router.push('/events')}
          />
        </View>

        <Text style={styles.sectionTitle}>Management</Text>

        <ManagementLink
          icon="people-outline"
          title="User Management"
          description="View accounts and manage permitted roles."
          onPress={() => router.push('/users')}
        />

        <ManagementLink
          icon="calendar-outline"
          title="Event Management"
          description="Create, edit, open, and close events."
          onPress={() => router.push('/events')}
        />

        <ManagementLink
          icon="analytics-outline"
          title="Attendance Overview"
          description="Review attendance records and correct mistakes."
          onPress={() => router.push('/attendance')}
        />
      </ScrollView>
    </View>
  );
}

function StatCard({
  title,
  value,
  icon,
  onPress,
}: {
  title: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.statCard} onPress={onPress}>
      <Ionicons name={icon} size={23} color={COLORS.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </Pressable>
  );
}

function ManagementLink({
  icon,
  title,
  description,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.linkCard} onPress={onPress}>
      <View style={styles.linkIcon}>
        <Ionicons name={icon} size={23} color={COLORS.primary} />
      </View>
      <View style={styles.linkBody}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.muted}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  hero: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    padding: 20,
    gap: 9,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  heroText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statCard: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    gap: 8,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 5,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  linkIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkBody: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  muted: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  notice: {
    margin: 18,
    padding: 22,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 8,
  },
  primaryButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '800',
  },
});
