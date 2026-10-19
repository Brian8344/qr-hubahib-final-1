import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';

import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';

type UserRole = 'student' | 'teacher' | 'admin';

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'Unknown';
}

function formatDate(isoString: string | null | undefined) {
  if (!isoString) return 'N/A';

  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return 'N/A';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HistoryScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<UserRole | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!user) {
      setRole(null);
      setStudentRecords([]);
      setTeacherEvents([]);
      setLoading(false);
      setError('Please sign in to view attendance history.');
      return;
    }

    setError(null);

    try {
      const profile = await getProfile(user.id);
      const currentRole = profile?.role ?? 'student';

      if (
        currentRole !== 'student' &&
        currentRole !== 'teacher' &&
        currentRole !== 'admin'
      ) {
        throw new Error('Your account role is not recognized.');
      }

      setRole(currentRole);

      if (currentRole === 'teacher') {
        const events = await getTeacherEventAttendance(user.id);

        setTeacherEvents(events);
        setStudentRecords([]);
      } else if (currentRole === 'student') {
        const records = await getAttendanceHistory(user.id);

        setStudentRecords(records);
        setTeacherEvents([]);
      } else {
        setStudentRecords([]);
        setTeacherEvents([]);
      }
    } catch (err) {
      console.error('Failed to load attendance history:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Unable to load attendance history. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading attendance history...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Header title="Attendance History" />
      </View>

      {error ? (
        <View style={styles.messageCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.helperText}>
            Pull down to refresh and try again.
          </Text>
        </View>
      ) : role === 'teacher' ? (
        <FlatList
          data={teacherEvents}
          keyExtractor={(item) => item.eventId}
          contentContainerStyle={
            teacherEvents.length === 0 ? styles.listEmptyContent : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No events created yet.</Text>
              <Text style={styles.helperText}>
                Events you create will appear here.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>

                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.attendeeCount} Present
                  </Text>
                </View>
              </View>

              <Text style={styles.codeText}>
                Event Code: {item.eventCode}
              </Text>

              <Text style={styles.dateText}>
                Start: {formatDate(item.startTime)}
              </Text>

              <Text style={styles.dateText}>
                End: {formatDate(item.endTime)}
              </Text>

              <View style={styles.divider} />

              <Text style={styles.attendeesHeader}>Attendees</Text>

              {item.attendees.length === 0 ? (
                <Text style={styles.noAttendeesText}>
                  No attendance recorded yet.
                </Text>
              ) : (
                item.attendees.map((att, idx) => (
                  <View
                    key={`${att.studentId}-${idx}`}
                    style={styles.attendeeRow}
                  >
                    <View style={styles.attendeeInfo}>
                      <Text style={styles.studentIdText}>
                        {att.studentName?.trim() ||
                          shortId(att.studentId)}
                      </Text>

                      <Text style={styles.scannedAtText}>
                        Scanned: {formatDate(att.scannedAt)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        />
      ) : role === 'admin' ? (
        <View style={styles.messageCard}>
          <Text style={styles.emptyText}>
            Administrator attendance reports are not displayed on this screen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={studentRecords}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            studentRecords.length === 0 ? styles.listEmptyContent : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No attendance records found.
              </Text>
              <Text style={styles.helperText}>
                Your attendance records will appear here after you scan an
                event QR code successfully.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{item.eventTitle}</Text>

              <Text style={styles.codeText}>
                Event Code: {item.eventCode}
              </Text>

              <Text style={styles.dateText}>
                Scanned: {formatDate(item.scannedAt)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  headerContainer: {
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  badge: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  codeText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginBottom: 6,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  attendeesHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  noAttendeesText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  attendeeInfo: {
    flex: 1,
  },
  studentIdText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
  },
  scannedAtText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  listEmptyContent: {
    flexGrow: 1,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18,
  },
  messageCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
