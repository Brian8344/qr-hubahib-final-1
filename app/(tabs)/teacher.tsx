
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  Platform,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  createEvent,
  getEventsByTeacher,
  type CloudEvent,
} from '@/lib/events';
import { getProfile, type Role } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [eventCode, setEventCode] = useState('');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 2 * 60 * 60 * 1000)
  );

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [startPickerMode, setStartPickerMode] =
    useState<'date' | 'time'>('date');
  const [endPickerMode, setEndPickerMode] =
    useState<'date' | 'time'>('date');

  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] =
    useState<'success' | 'error'>('success');

  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const loadEvents = useCallback(async () => {
    if (!user) return;

    setEventsLoading(true);
    try {
      const result = await getEventsByTeacher(user.id);
      setEvents(result);
    } catch {
      showMessage('Could not load your events. Please try again.', 'error');
    } finally {
      setEventsLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function initialize() {
        if (!user) {
          setRoleLoading(false);
          setRole(null);
          return;
        }

        try {
          const profile = await getProfile(user.id);

          if (!active) return;

          setRole(profile?.role ?? 'student');

          if (profile?.role === 'teacher') {
            const result = await getEventsByTeacher(user.id);
            if (active) setEvents(result);
          }
        } catch {
          if (active) setRole(null);
        } finally {
          if (active) setRoleLoading(false);
        }
      }

      setRoleLoading(true);
      void initialize();

      return () => {
        active = false;
      };
    }, [user])
  );

  const showMessage = (
    message: string,
    type: 'success' | 'error'
  ) => {
    setStatusMessage(message);
    setStatusType(type);
  };

  const handleCreateEvent = async () => {
    if (!user) {
      showMessage('Please log in before creating an event.', 'error');
      return;
    }

    const trimmedTitle = title.trim();
    const normalizedCode = eventCode
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-');

    if (!trimmedTitle) {
      showMessage('Please enter an event title.', 'error');
      return;
    }

    if (trimmedTitle.length < 3) {
      showMessage(
        'Event title must contain at least 3 characters.',
        'error'
      );
      return;
    }

    if (!normalizedCode) {
      showMessage('Please enter an event code.', 'error');
      return;
    }

    if (normalizedCode.length < 3 || normalizedCode.length > 30) {
      showMessage(
        'Event code must contain 3 to 30 characters.',
        'error'
      );
      return;
    }

    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalizedCode)) {
      showMessage(
        'Use only letters, numbers, and single hyphens in the event code.',
        'error'
      );
      return;
    }

    if (endDate.getTime() <= startDate.getTime()) {
      showMessage('End time must be later than start time.', 'error');
      return;
    }

    setSaving(true);
    setStatusMessage(null);
    setGeneratedQR(null);
    setGeneratedCode(null);

    // The custom event code is used as the event identifier.
    // The database must enforce uniqueness for event_code.
    const eventData = {
      eventId: normalizedCode,
      title: trimmedTitle,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    };

    try {
      const { error } = await createEvent(eventData);

      if (error) {
        showMessage(
          /unique|duplicate|already exists/i.test(error)
            ? 'This event code is already in use. Please choose another code.'
            : error,
          'error'
        );
        return;
      }

      const qrPayload = buildQRPayload(eventData);

      setGeneratedCode(normalizedCode);
      setGeneratedQR(qrPayload);
      setTitle('');
      setEventCode('');

      showMessage(
        'Event saved successfully. Your event code and QR are ready.',
        'success'
      );

      await loadEvents();
    } catch {
      showMessage(
        'Could not save the event. Check your connection and try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.mutedText}>Checking your account...</Text>
      </View>
    );
  }

  if (role !== 'teacher') {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.lockIcon}>
          <Ionicons
            name="lock-closed-outline"
            size={36}
            color={COLORS.primary}
          />
        </View>
        <Text style={styles.lockTitle}>Teachers Only</Text>
        <Text style={styles.lockSubtitle}>
          Only authorized teacher accounts can create and manage events.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.pageHeader}>
        <Text style={styles.pageEyebrow}>TEACHER WORKSPACE</Text>
        <Text style={styles.pageTitle}>Event Management</Text>
        <Text style={styles.pageSubtitle}>
          Create events and generate attendance QR codes.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Header
          title="Create Event"
          subtitle="Set up a new attendance session"
        />

        <Text style={styles.label}>EVENT TITLE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. General Assembly 2026"
          placeholderTextColor={COLORS.textSecondary}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          returnKeyType="next"
        />

        {/* NEW: Custom Event Code field below Event Title */}
        <Text style={styles.label}>EVENT CODE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. BSIT-GA-2026"
          placeholderTextColor={COLORS.textSecondary}
          value={eventCode}
          onChangeText={(value) =>
            setEventCode(
              value.toUpperCase().replace(/\s+/g, '-')
            )
          }
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={30}
          returnKeyType="done"
        />
        <Text style={styles.inputHint}>
          Create a unique code using letters, numbers, and hyphens.
        </Text>

        <Text style={styles.label}>START TIME</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.dateButton}
          onPress={() => {
            setStartPickerMode('date');
            setShowStartPicker(true);
          }}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.dateText}>
            {startDate.toLocaleString()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={COLORS.textSecondary}
          />
        </Pressable>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode={startPickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (Platform.OS !== 'ios') {
                setShowStartPicker(false);
              }

              if (date) {
                setStartDate(date);

                if (
                  startPickerMode === 'date' &&
                  Platform.OS !== 'ios'
                ) {
                  setStartPickerMode('time');
                  setShowStartPicker(true);
                } else if (startPickerMode === 'time') {
                  setShowStartPicker(false);
                }
              }
            }}
          />
        )}

        <Text style={styles.label}>END TIME</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.dateButton}
          onPress={() => {
            setEndPickerMode('date');
            setShowEndPicker(true);
          }}
        >
          <Ionicons
            name="time-outline"
            size={20}
            color={COLORS.primary}
          />
          <Text style={styles.dateText}>
            {endDate.toLocaleString()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={COLORS.textSecondary}
          />
        </Pressable>

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode={endPickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (Platform.OS !== 'ios') {
                setShowEndPicker(false);
              }

              if (date) {
                setEndDate(date);

                if (
                  endPickerMode === 'date' &&
                  Platform.OS !== 'ios'
                ) {
                  setEndPickerMode('time');
                  setShowEndPicker(true);
                } else if (endPickerMode === 'time') {
                  setShowEndPicker(false);
                }
              }
            }}
          />
        )}

        {statusMessage ? (
          <View
            style={[
              styles.messageBox,
              statusType === 'success'
                ? styles.successBox
                : styles.errorBox,
            ]}
          >
            <Ionicons
              name={
                statusType === 'success'
                  ? 'checkmark-circle'
                  : 'alert-circle'
              }
              size={20}
              color={
                statusType === 'success'
                  ? COLORS.success
                  : COLORS.danger
              }
            />
            <Text
              style={[
                styles.messageText,
                {
                  color:
                    statusType === 'success'
                      ? COLORS.success
                      : COLORS.danger,
                },
              ]}
            >
              {statusMessage}
            </Text>
          </View>
        ) : null}

        <AppButton
          theme="primary"
          title={saving ? 'Saving Event...' : 'Save & Generate QR'}
          icon="qr-code-outline"
          loading={saving}
          disabled={saving}
          onPress={handleCreateEvent}
        />
      </View>

      {generatedCode && generatedQR ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={styles.resultIcon}>
              <Ionicons
                name="checkmark-done"
                size={23}
                color={COLORS.success}
              />
            </View>
            <View style={styles.resultHeaderText}>
              <Text style={styles.resultTitle}>Event Created</Text>
              <Text style={styles.resultSubtitle}>
                Your attendance code is ready.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>EVENT CODE</Text>
          <View style={styles.codeBox}>
            <View style={styles.codeTextContainer}>
              <Text style={styles.codeText}>{generatedCode}</Text>
              <Text style={styles.codeHint}>
                Share this code with attendees.
              </Text>
            </View>
            <Ionicons
              name="key-outline"
              size={23}
              color={COLORS.accent}
            />
          </View>

          <View style={styles.qrSection}>
            <Text style={styles.qrTitle}>Attendance QR Code</Text>
            <Text style={styles.qrSubtitle}>
              Students can scan this code using your app's Scan QR tab.
            </Text>

            <View style={styles.qrBox}>
              <QRCode value={generatedQR} size={210} />
            </View>

            <Text style={styles.qrFootnote}>
              Keep this QR code available during the event.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.eventsSection}>
        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Your Events</Text>
            <Text style={styles.sectionSubtitle}>
              Events created by your account
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            style={styles.refreshButton}
            onPress={() => void loadEvents()}
          >
            <Ionicons
              name="refresh-outline"
              size={20}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        {eventsLoading ? (
          <ActivityIndicator
            color={COLORS.primary}
            style={{ marginVertical: 24 }}
          />
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="calendar-outline"
              size={34}
              color={COLORS.muted}
            />
            <Text style={styles.emptyTitle}>No events yet</Text>
            <Text style={styles.emptyText}>
              Create your first event using the form above.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventIcon}>
                <Ionicons
                  name="calendar"
                  size={22}
                  color={COLORS.accent}
                />
              </View>

              <View style={styles.eventInfo}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventCode}>
                  Code: {event.event_code}
                </Text>
                <Text style={styles.eventDate}>
                  {event.start_time
                    ? new Date(event.start_time).toLocaleString()
                    : 'Start time not set'}
                </Text>
                <View
                  style={[
                    styles.statusPill,
                    event.status === 'open'
                      ? styles.openPill
                      : styles.closedPill,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      event.status === 'open'
                        ? styles.openText
                        : styles.closedText,
                    ]}
                  >
                    {event.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: COLORS.background,
  },
  pageHeader: {
    marginBottom: 18,
  },
  pageEyebrow: {
    fontSize: 10,
    letterSpacing: 1.7,
    fontWeight: '800',
    color: COLORS.accentDark,
    marginBottom: 6,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: -0.7,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginTop: 5,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 18,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
    color: COLORS.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  input: {
    minHeight: 50,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  inputHint: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  dateButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    marginBottom: 10,
  },
  successBox: {
    backgroundColor: COLORS.successLight,
  },
  errorBox: {
    backgroundColor: COLORS.dangerLight,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    marginBottom: 22,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultHeaderText: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  resultSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    padding: 16,
    gap: 12,
  },
  codeTextContainer: {
    flex: 1,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  codeHint: {
    color: COLORS.darkMuted,
    fontSize: 12,
    marginTop: 5,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 24,
  },
  qrTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  qrSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: 6,
    marginBottom: 16,
  },
  qrBox: {
    padding: 18,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrFootnote: {
    marginTop: 12,
    fontSize: 12,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  eventsSection: {
    marginTop: 4,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  refreshButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 26,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 10,
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 5,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 13,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 15,
    marginBottom: 10,
  },
  eventIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.darkBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  eventCode: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 5,
  },
  eventDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 5,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 9,
  },
  openPill: {
    backgroundColor: COLORS.successLight,
  },
  closedPill: {
    backgroundColor: COLORS.dangerLight,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  openText: {
    color: COLORS.success,
  },
  closedText: {
    color: COLORS.danger,
  },
  mutedText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  lockIcon: {
    width: 68,
    height: 68,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  lockTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  lockSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
