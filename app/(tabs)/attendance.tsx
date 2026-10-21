
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import { getProfile } from '@/lib/profiles';
import { supabase } from '@/lib/supabase';

type AttendanceRow = {
  id: string;
  student_id: string;
  event_id: string;
  scanned_at: string;
  events:
    | { title: string; event_code: string }
    | { title: string; event_code: string }[]
    | null;
};

export default function AttendanceScreen() {
  const { user, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const loadRecords = useCallback(async () => {
    if (authLoading) return;

    if (!user) {
      setError('Please log in first.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const profile = await getProfile(user.id);

      if (profile?.role !== 'admin') {
        setAuthorized(false);
        setError('Only administrators can view all attendance records.');
        return;
      }

      setAuthorized(true);
      setError('');

      const result = await supabase
        .from('attendance')
        .select(
          'id,student_id,event_id,scanned_at,events(title,event_code)'
        )
        .order('scanned_at', { ascending: false });

      if (result.error) throw result.error;
      setRecords((result.data ?? []) as unknown as AttendanceRow[]);
    } catch (e) {
      console.error('Load attendance error:', e);
      setError(
        'Could not load attendance. Check your attendance table relationships and Supabase permissions.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  const deleteRecord = (record: AttendanceRow) => {
    Alert.alert(
      'Remove attendance record?',
      'This permanently deletes this attendance entry. Continue only if it is incorrect.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await supabase
              .from('attendance')
              .delete()
              .eq('id', record.id);

            if (result.error) {
              Alert.alert('Delete failed', result.error.message);
              return;
            }

            await loadRecords();
          },
        },
      ]
    );
  };

  const filteredRecords = records.filter((record) => {
    const event = Array.isArray(record.events)
      ? record.events[0]
      : record.events;

    const query = search.trim().toLowerCase();

    return (
      record.student_id.toLowerCase().includes(query) ||
      (event?.title ?? '').toLowerCase().includes(query) ||
      (event?.event_code ?? '').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading attendance records...</Text>
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={styles.container}>
        <Header title="Attendance Overview" />
        <Text style={styles.error}>{error || 'Access restricted.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Attendance Overview" subtitle="System-wide attendance records" />

      <View style={styles.summary}>
        <Ionicons name="clipboard" size={25} color={COLORS.primary} />
        <View>
          <Text style={styles.summaryNumber}>{records.length}</Text>
          <Text style={styles.muted}>Total attendance records</Text>
        </View>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search student ID, event, or code..."
        placeholderTextColor={COLORS.muted}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadRecords();
            }}
          />
        }
      >
        {filteredRecords.map((record) => {
          const event = Array.isArray(record.events)
            ? record.events[0]
            : record.events;

          return (
            <View key={record.id} style={styles.card}>
              <View style={styles.recordHeading}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={COLORS.success}
                  />
                </View>

                <View style={styles.recordInfo}>
                  <Text style={styles.title}>
                    {event?.title || 'Unknown event'}
                  </Text>
                  <Text style={styles.muted}>
                    Event code: {event?.event_code || 'Unavailable'}
                  </Text>
                </View>
              </View>

              <View style={styles.detail}>
                <Text style={styles.label}>Student ID</Text>
                <Text style={styles.value}>{record.student_id}</Text>
              </View>

              <View style={styles.detail}>
                <Text style={styles.label}>Scanned at</Text>
                <Text style={styles.value}>
                  {record.scanned_at
                    ? new Date(record.scanned_at).toLocaleString()
                    : 'Unavailable'}
                </Text>
              </View>

              <Pressable
                style={styles.deleteButton}
                onPress={() => deleteRecord(record)}
              >
                <Ionicons name="trash-outline" size={17} color={COLORS.danger} />
                <Text style={styles.deleteText}>Remove incorrect record</Text>
              </Pressable>
            </View>
          );
        })}

        {filteredRecords.length === 0 && (
          <Text style={styles.empty}>No attendance records found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    gap: 12,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: COLORS.primaryLight,
    margin: 16,
    padding: 18,
    borderRadius: 16,
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  search: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 13,
    marginHorizontal: 16,
    marginBottom: 8,
    color: COLORS.textPrimary,
  },
  list: { padding: 16, paddingTop: 4, paddingBottom: 28, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    gap: 12,
  },
  recordHeading: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordInfo: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  muted: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary },
  detail: { gap: 4 },
  label: { fontSize: 11, fontWeight: '700', color: COLORS.muted },
  value: { fontSize: 13, color: COLORS.textPrimary },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.dangerLight,
    backgroundColor: COLORS.dangerLight,
    borderRadius: 10,
    padding: 11,
  },
  deleteText: { color: COLORS.danger, fontWeight: '700', fontSize: 12 },
  error: { margin: 16, color: COLORS.danger },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 24 },
});
