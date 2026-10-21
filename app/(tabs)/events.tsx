
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

type EventRow = {
  id: string;
  event_code: string;
  title: string;
  start_time: string | null;
  end_time: string | null;
  created_by: string | null;
  created_at: string;
  venue: string | null;
  description: string | null;
  status: 'open' | 'closed';
};

type EventForm = {
  title: string;
  event_code: string;
  venue: string;
  description: string;
  start_time: string;
  end_time: string;
};

const emptyForm: EventForm = {
  title: '',
  event_code: '',
  venue: '',
  description: '',
  start_time: '',
  end_time: '',
};

export default function EventsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<EventForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadEvents = useCallback(async () => {
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
        setError('Only administrators can manage events.');
        return;
      }

      setAuthorized(true);
      setError('');

      const result = await supabase
        .from('events')
        .select(
          'id,event_code,title,start_time,end_time,created_by,created_at,venue,description,status'
        )
        .order('created_at', { ascending: false });

      if (result.error) throw result.error;
      setEvents((result.data ?? []) as EventRow[]);
    } catch (e) {
      console.error('Load events error:', e);
      setError('Unable to load events. Check your Supabase permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const setField = (key: keyof EventForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const startEdit = (item: EventRow) => {
    setEditingId(item.id);
    setForm({
      title: item.title ?? '',
      event_code: item.event_code ?? '',
      venue: item.venue ?? '',
      description: item.description ?? '',
      start_time: item.start_time ?? '',
      end_time: item.end_time ?? '',
    });
    setShowForm(true);
  };

  const saveEvent = async () => {
    if (!user) return;

    if (!form.title.trim() || !form.event_code.trim()) {
      Alert.alert('Missing information', 'Enter an event title and event code.');
      return;
    }

    setSaving(true);

    const payload = {
      title: form.title.trim(),
      event_code: form.event_code.trim(),
      venue: form.venue.trim() || null,
      description: form.description.trim() || null,
      start_time: form.start_time.trim() || null,
      end_time: form.end_time.trim() || null,
    };

    try {
      const result = editingId
        ? await supabase.from('events').update(payload).eq('id', editingId)
        : await supabase.from('events').insert({
            ...payload,
            created_by: user.id,
            status: 'open',
          });

      if (result.error) throw result.error;

      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      Alert.alert('Success', editingId ? 'Event updated.' : 'Event created.');
      await loadEvents();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Could not save event', message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = (item: EventRow) => {
    const nextStatus = item.status === 'open' ? 'closed' : 'open';

    Alert.alert(
      `${nextStatus === 'open' ? 'Reopen' : 'Close'} event?`,
      item.title,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            const result = await supabase
              .from('events')
              .update({ status: nextStatus })
              .eq('id', item.id);

            if (result.error) {
              Alert.alert('Update failed', result.error.message);
              return;
            }

            await loadEvents();
          },
        },
      ]
    );
  };

  const deleteEvent = (item: EventRow) => {
    Alert.alert(
      'Delete event?',
      `Delete "${item.title}"? Related attendance may prevent deletion.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await supabase
              .from('events')
              .delete()
              .eq('id', item.id);

            if (result.error) {
              Alert.alert('Delete failed', result.error.message);
              return;
            }

            await loadEvents();
          },
        },
      ]
    );
  };

  const filtered = events.filter((item) => {
    const query = search.trim().toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.event_code.toLowerCase().includes(query) ||
      (item.venue ?? '').toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.muted}>Loading events...</Text>
      </View>
    );
  }

  if (!authorized) {
    return (
      <View style={styles.container}>
        <Header title="Event Management" />
        <Text style={styles.error}>{error || 'Access restricted.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Event Management" subtitle="Manage attendance events" />

      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Search events..."
          placeholderTextColor={COLORS.muted}
          value={search}
          onChangeText={setSearch}
        />
        <Pressable style={styles.addButton} onPress={startCreate}>
          <Ionicons name="add" size={21} color={COLORS.textOnPrimary} />
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showForm && (
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formTitle}>
            {editingId ? 'Edit Event' : 'Create Event'}
          </Text>

          <Field label="Event title" value={form.title}
            onChangeText={(v) => setField('title', v)} />
          <Field label="Event code" value={form.event_code}
            onChangeText={(v) => setField('event_code', v)} />
          <Field label="Venue" value={form.venue}
            onChangeText={(v) => setField('venue', v)} />
          <Field label="Description" value={form.description}
            onChangeText={(v) => setField('description', v)} />
          <Field
            label="Start time (ISO format)"
            value={form.start_time}
            placeholder="2026-10-20T09:00:00+08:00"
            onChangeText={(v) => setField('start_time', v)}
          />
          <Field
            label="End time (ISO format)"
            value={form.end_time}
            placeholder="2026-10-20T17:00:00+08:00"
            onChangeText={(v) => setField('end_time', v)}
          />

          <Pressable
            style={styles.addButton}
            onPress={saveEvent}
            disabled={saving}
          >
            <Text style={styles.addText}>
              {saving ? 'Saving...' : 'Save Event'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => setShowForm(false)}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      )}

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadEvents();
            }}
          />
        }
      >
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.eventHeading}>
              <View style={styles.eventIcon}>
                <Ionicons name="calendar" size={22} color={COLORS.primary} />
              </View>
              <View style={styles.eventInfo}>
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.muted}>Code: {item.event_code}</Text>
                <Text style={styles.muted}>Venue: {item.venue || 'Not set'}</Text>
              </View>
              <Text
                style={[
                  styles.status,
                  item.status === 'open' ? styles.open : styles.closed,
                ]}
              >
                {item.status}
              </Text>
            </View>

            {item.description ? (
              <Text style={styles.description}>{item.description}</Text>
            ) : null}

            <Text style={styles.muted}>
              Start: {item.start_time || 'Not set'}
            </Text>
            <Text style={styles.muted}>
              End: {item.end_time || 'Not set'}
            </Text>

            <View style={styles.actions}>
              <Action label="Edit" icon="create-outline" onPress={() => startEdit(item)} />
              <Action
                label={item.status === 'open' ? 'Close' : 'Reopen'}
                icon={item.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
                onPress={() => toggleStatus(item)}
              />
              <Action label="Delete" icon="trash-outline" danger onPress={() => deleteEvent(item)} />
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <Text style={styles.empty}>No events found.</Text>
        )}
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={COLORS.muted}
        autoCapitalize="none"
      />
    </View>
  );
}

function Action({
  label,
  icon,
  onPress,
  danger = false,
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable style={styles.action} onPress={onPress}>
      <Ionicons
        name={icon}
        size={16}
        color={danger ? COLORS.danger : COLORS.primary}
      />
      <Text style={[styles.actionText, danger && { color: COLORS.danger }]}>
        {label}
      </Text>
    </Pressable>
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  search: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: COLORS.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  addText: { color: COLORS.textOnPrimary, fontWeight: '800' },
  formScroll: {
    maxHeight: 360,
    marginHorizontal: 15,
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  form: { padding: 14, gap: 12 },
  formTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  field: { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 11,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    alignItems: 'center',
    padding: 12,
  },
  cancelText: { color: COLORS.textPrimary, fontWeight: '700' },
  list: { padding: 15, paddingTop: 4, paddingBottom: 28, gap: 12 },
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    gap: 10,
  },
  eventHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: { flex: 1, gap: 4 },
  title: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  muted: { fontSize: 12, lineHeight: 18, color: COLORS.textSecondary },
  description: { color: COLORS.textSecondary, lineHeight: 20 },
  status: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  open: { color: COLORS.success, backgroundColor: COLORS.successLight },
  closed: { color: COLORS.danger, backgroundColor: COLORS.dangerLight },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: COLORS.background,
  },
  actionText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  error: { marginHorizontal: 16, color: COLORS.danger },
  empty: { textAlign: 'center', color: COLORS.textSecondary, padding: 24 },
});
