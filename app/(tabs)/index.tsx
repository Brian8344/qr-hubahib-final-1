
import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile, type Role } from '@/lib/profiles';
import { getAvailableEvents, type CloudEvent } from '@/lib/events';
import { getEventsByTeacher } from '@/lib/events';

function formatDate(value: string | null): string {
  if (!value) return 'Not specified';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Not specified';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function HomeScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [fullName, setFullName] = useState('');
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [teacherEventCount, setTeacherEventCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const loadHome = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setErrorMessage('');

    try {
      if (!user) {
        setRole(null);
        setFullName('');
        setEvents([]);
        setTeacherEventCount(0);
        return;
      }

      const profile = await getProfile(user.id);

      if (!profile) {
        setRole(null);
        setErrorMessage(
          'Your profile could not be loaded. Please sign in again or contact your administrator.'
        );
        return;
      }

      setRole(profile.role);
      setFullName(profile.full_name?.trim() || 'User');

      if (profile.role === 'student') {
        const availableEvents = await getAvailableEvents();
        setEvents(availableEvents);
        setTeacherEventCount(0);
      } else if (profile.role === 'teacher') {
        const teacherEvents = await getEventsByTeacher(user.id);
        setTeacherEventCount(teacherEvents.length);
        setEvents([]);
      } else {
        setEvents([]);
        setTeacherEventCount(0);
      }
    } catch (error) {
      console.error('Failed to load Home screen:', error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load the Home screen. Please try again.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.helperText}>Loading your Home screen...</Text>
      </View>
    );
  }

  if (!role) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.pagePadding}>
          <Header title="QR Attendance" subtitle="Account dashboard" />

          <View style={styles.messageCard}>
            <Ionicons
              name="alert-circle-outline"
              size={30}
              color={COLORS.danger}
            />

            <Text style={styles.errorText}>
              {errorMessage || 'Your account role could not be identified.'}
            </Text>

            <AppButton
              title="Try Again"
              icon="refresh-outline"
              onPress={() => void loadHome()}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadHome(true)}
            colors={[COLORS.primary]}
          />
        }
      >
        <View style={styles.pagePadding}>
          <Header
            title={
              role === 'student'
                ? 'Student Home'
                : role === 'teacher'
                  ? 'Teacher Home'
                  : 'Admin Home'
            }
            subtitle={`Welcome, ${fullName}`}
          />

          {errorMessage ? (
            <View style={styles.messageCard}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              <AppButton
                title="Reload"
                icon="refresh-outline"
                onPress={() => void loadHome()}
              />
            </View>
          ) : null}

          {/* STUDENT DASHBOARD */}
          {role === 'student' ? (
            <>
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIcon}>
                  <Ionicons
                    name="school-outline"
                    size={28}
                    color={COLORS.primary}
                  />
                </View>

                <Text style={styles.welcomeTitle}>
                  Welcome to your student portal
                </Text>

                <Text style={styles.welcomeText}>
                  Check school events, scan an event QR code, and review your
                  attendance history.
                </Text>
              </View>

              <View style={styles.sectionHeading}>
                <Ionicons
                  name="calendar-outline"
                  size={23}
                  color={COLORS.primary}
                />
                <Text style={styles.sectionTitle}>
                  Available Events
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{events.length}</Text>
                </View>
              </View>

              {events.length === 0 ? (
                <View style={styles.messageCard}>
                  <Ionicons
                    name="calendar-clear-outline"
                    size={32}
                    color={COLORS.muted}
                  />

                  <Text style={styles.cardTitle}>
                    No Available Events
                  </Text>

                  <Text style={styles.helperText}>
                    Open events created by your teacher or administrator will
                    appear here.
                  </Text>

                  <AppButton
                    title="Refresh Events"
                    icon="refresh-outline"
                    onPress={() => void loadHome(true)}
                  />
                </View>
              ) : (
                events.map((event) => (
                  <View key={event.id} style={styles.eventCard}>
                    <View style={styles.eventHeader}>
                      <View style={styles.eventIcon}>
                        <Ionicons
                          name="calendar"
                          size={22}
                          color={COLORS.primary}
                        />
                      </View>

                      <View style={styles.eventHeading}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.helperText}>
                          Code: {event.event_code}
                        </Text>
                      </View>

                      <View style={styles.openBadge}>
                        <Text style={styles.openBadgeText}>OPEN</Text>
                      </View>
                    </View>

                    <Text style={styles.detailText}>
                      Starts: {formatDate(event.start_time)}
                    </Text>

                    {event.end_time ? (
                      <Text style={styles.detailText}>
                        Ends: {formatDate(event.end_time)}
                      </Text>
                    ) : null}

                    {event.venue ? (
                      <Text style={styles.detailText}>
                        Venue: {event.venue}
                      </Text>
                    ) : null}

                    {event.description ? (
                      <Text style={styles.description}>
                        {event.description}
                      </Text>
                    ) : null}

                    <AppButton
                      theme="primary"
                      title="Scan QR Code"
                      icon="qr-code-outline"
                      onPress={() => router.push('/scan')}
                    />
                  </View>
                ))
              )}

              <AppButton
                title="My Attendance History"
                icon="time-outline"
                onPress={() => router.push('/history')}
              />

              <AppButton
                title="My Profile"
                icon="person-outline"
                onPress={() => router.push('/profile')}
              />
            </>
          ) : null}

          {/* TEACHER DASHBOARD */}
          {role === 'teacher' ? (
            <>
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIcon}>
                  <Ionicons
                    name="easel-outline"
                    size={28}
                    color={COLORS.primary}
                  />
                </View>

                <Text style={styles.welcomeTitle}>
                  Teacher Workspace
                </Text>

                <Text style={styles.welcomeText}>
                  Create school events, generate QR codes, and review
                  attendance for your events.
                </Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{teacherEventCount}</Text>
                <Text style={styles.statLabel}>Events You Created</Text>
              </View>

              <AppButton
                theme="primary"
                title="Create and Manage Events"
                icon="calendar-outline"
                onPress={() => router.push('/teacher')}
              />

              <AppButton
                title="View Attendance Records"
                icon="people-outline"
                onPress={() => router.push('/history')}
              />

              <AppButton
                title="My Profile"
                icon="person-outline"
                onPress={() => router.push('/profile')}
              />
            </>
          ) : null}

          {/* ADMIN DASHBOARD */}
          {role === 'admin' ? (
            <>
              <View style={styles.welcomeCard}>
                <View style={styles.welcomeIcon}>
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={28}
                    color={COLORS.primary}
                  />
                </View>

                <Text style={styles.welcomeTitle}>
                  Administrator Workspace
                </Text>

                <Text style={styles.welcomeText}>
                  Access the administrator area to manage and oversee the
                  attendance system.
                </Text>
              </View>

              <View style={styles.adminFeatureCard}>
                <Ionicons
                  name="people-outline"
                  size={25}
                  color={COLORS.primary}
                />
                <View style={styles.featureText}>
                  <Text style={styles.cardTitle}>User Management</Text>
                  <Text style={styles.helperText}>
                    Administrator tools for managing user accounts.
                  </Text>
                </View>
              </View>

              <View style={styles.adminFeatureCard}>
                <Ionicons
                  name="calendar-outline"
                  size={25}
                  color={COLORS.primary}
                />
                <View style={styles.featureText}>
                  <Text style={styles.cardTitle}>Event Management</Text>
                  <Text style={styles.helperText}>
                    Access the administrator area for event-related tools.
                  </Text>
                </View>
              </View>

              <View style={styles.adminFeatureCard}>
                <Ionicons
                  name="analytics-outline"
                  size={25}
                  color={COLORS.primary}
                />
                <View style={styles.featureText}>
                  <Text style={styles.cardTitle}>Attendance Overview</Text>
                  <Text style={styles.helperText}>
                    Administrator attendance reports and records.
                  </Text>
                </View>
              </View>

              <AppButton
                theme="primary"
                title="Open Admin Dashboard"
                icon="shield-checkmark-outline"
                onPress={() => router.push('/admin')}
              />

              <AppButton
                title="My Profile"
                icon="person-outline"
                onPress={() => router.push('/profile')}
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  pagePadding: {
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 24,
    gap: 12,
  },
  welcomeCard: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 18,
    padding: 20,
    marginBottom: 24,
    gap: 10,
  },
  welcomeIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  welcomeTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  welcomeText: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textSecondary,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 14,
    gap: 10,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventHeading: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  openBadge: {
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  openBadgeText: {
    color: COLORS.success,
    fontSize: 10,
    fontWeight: '800',
  },
  detailText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  description: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textPrimary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  messageCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  helperText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
  },
  statNumber: {
    fontSize: 34,
    fontWeight: '900',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  adminFeatureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  featureText: {
    flex: 1,
    gap: 5,
  },
});
