import React, { useState, useCallback } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import QRCode from 'react-native-qrcode-svg';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  closeEvent,
  createEvent,
  getEventsByTeacher,
  reopenEvent,
  type CloudEvent,
} from '@/lib/events';
import { getProfile, type Role } from '@/lib/profiles';
import { buildQRPayload } from '@/lib/qr';

type MessageType = 'success' | 'error';

const EMPTY_TITLE = '';
const EMPTY_CODE = '';

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Invalid date';

  return date.toLocaleString();
}

function createInitialEndDate() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}

export default function TeacherScreen() {
  const { user } = useAuth();

  const [role, setRole] = useState<Role | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);

  const [title, setTitle] = useState(EMPTY_TITLE);
  const [eventCode, setEventCode] = useState(EMPTY_CODE);
  const [venue, setVenue] = useState('');
  const [description, setDescription] = useState('');

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(createInitialEndDate());

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [startPickerMode, setStartPickerMode] =
    useState<'date' | 'time'>('date');
  const [endPickerMode, setEndPickerMode] =
    useState<'date' | 'time'>('date');

  const [generatedQR, setGeneratedQR] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<MessageType>('success');

  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<CloudEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [changingEventId, setChangingEventId] = useState<string | null>(null);

  const [editingEvent, setEditingEvent] = useState<CloudEvent | null>(null);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const showMessage = useCallback(
    (message: string, type: MessageType) => {
      setStatusMessage(message);
      setStatusType(type);
    },
    []
  );

  const loadEvents = useCallback(async () => {
    if (!user) {
      setEvents([]);
      return;
    }

    setEventsLoading(true);

    try {
      const result = await getEventsByTeacher(user.id);
      setEvents(result);
    } catch (error) {
      console.error('Unable to load teacher events:', error);
      showMessage('Could not load your events. Please try again.', 'error');
    } finally {
      setEventsLoading(false);
    }
  }, [user, showMessage]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function initialize() {
        if (!user) {
          setRole(null);
          setEvents([]);
          setRoleLoading(false);
          return;
        }

        setRoleLoading(true);

        try {
          const profile = await getProfile(user.id);

          if (!active) return;

          setRole(profile?.role ?? null);

          if (profile?.role === 'teacher') {
            const result = await getEventsByTeacher(user.id);

            if (active) setEvents(result);
          } else {
            setEvents([]);
          }
        } catch (error) {
          console.error('Unable to initialize teacher screen:', error);

          if (active) {
            setRole(null);
            setEvents([]);
          }
        } finally {
          if (active) setRoleLoading(false);
        }
      }

      void initialize();

      return () => {
        active = false;
      };
    }, [user])
  );

  const resetForm = () => {
    setTitle('');
    setEventCode('');
    setVenue('');
    setDescription('');
    setStartDate(new Date());
    setEndDate(createInitialEndDate());
    setEditingEvent(null);
    setGeneratedQR(null);
    setGeneratedCode(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  const beginEdit = (event: CloudEvent) => {
    setEditingEvent(event);
    setTitle(event.title);
    setEventCode(event.event_code);
    setVenue(event.venue ?? '');
    setDescription(event.description ?? '');

    setStartDate(
      event.start_time ? new Date(event.start_time) : new Date()
    );

    setEndDate(
      event.end_time ? new Date(event.end_time) : createInitialEndDate()
    );

    setGeneratedQR(null);
    setGeneratedCode(null);
    setStatusMessage(null);
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  const handleCreateEvent = async () => {
    if (!user) {
      showMessage('Please log in before managing events.', 'error');
      return;
    }

    const trimmedTitle = title.trim();
    const normalizedCode = eventCode
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '-');
    const trimmedVenue = venue.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 3) {
      showMessage(
        'Event title must contain at least 3 characters.',
        'error'
      );
      return;
    }

    if (trimmedTitle.length > 120) {
      showMessage('Event title cannot exceed 120 characters.', 'error');
      return;
    }

    if (!normalizedCode) {
      showMessage('Please enter an event code.', 'error');
      return;
    }

    if (normalizedCode.length < 3 || normalizedCode.length > 30) {
      showMessage('Event code must contain 3 to 30 characters.', 'error');
      return;
    }

    if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/.test(normalizedCode)) {
      showMessage(
        'Use only letters, numbers, and single hyphens in the event code.',
        'error'
      );
      return;
    }

    if (trimmedVenue.length > 150) {
      showMessage('Venue cannot exceed 150 characters.', 'error');
      return;
    }

    if (trimmedDescription.length > 1000) {
      showMessage('Description cannot exceed 1000 characters.', 'error');
      return;
    }

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      showMessage('Please select valid start and end dates.', 'error');
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

    const eventData = {
      eventId: normalizedCode,
      title: trimmedTitle,
      start: startDate.toISOString(),
      end: endDate.toISOString(),
      venue: trimmedVenue,
      description: trimmedDescription,
    };

    try {
      if (editingEvent) {
        const { supabase } = await import('@/lib/supabase');

        const { error } = await supabase
          .from('events')
          .update({
            event_code: normalizedCode,
            title: trimmedTitle,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            venue: trimmedVenue || null,
            description: trimmedDescription || null,
          })
          .eq('id', editingEvent.id)
          .eq('created_by', user.id);

        if (error) {
          showMessage(
            /unique|duplicate|already exists/i.test(error.message)
              ? 'This event code is already in use.'
              : error.message,
            'error'
          );
          return;
        }

        showMessage('Event updated successfully.', 'success');

        resetForm();
      } else {
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
        setVenue('');
        setDescription('');

        showMessage(
          'Event saved successfully. Your event code and QR are ready.',
          'success'
        );
      }

      await loadEvents();
    } catch (error) {
      console.error('Unable to save event:', error);

      showMessage(
        'Could not save the event. Check your connection and try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEventStatus = async (event: CloudEvent) => {
    const action = event.status === 'open' ? 'close' : 'reopen';

    Alert.alert(
      `${action === 'close' ? 'Close' : 'Reopen'} event?`,
      `${event.title} will be ${
        action === 'close' ? 'closed' : 'reopened'
      } for attendance.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'close' ? 'Close Event' : 'Reopen Event',
          onPress: () => {
            void (async () => {
              setChangingEventId(event.id);

              try {
                const result =
                  action === 'close'
                    ? await closeEvent(event.id)
                    : await reopenEvent(event.id);

                if (result?.error) {
                  showMessage(result.error, 'error');
                } else {
                  showMessage(
                    action === 'close'
                      ? 'Event closed successfully.'
                      : 'Event reopened successfully.',
                    'success'
                  );

                  await loadEvents();
                }
              } catch (error) {
                console.error('Unable to change event status:', error);
                showMessage('Could not update the event status.', 'error');
              } finally {
                setChangingEventId(null);
              }
            })();
          },
        },
      ]
    );
  };

  const handleViewQR = (event: CloudEvent) => {
    const payload = buildQRPayload({
      eventId: event.event_code,
      title: event.title,
      start: event.start_time ?? '',
      end: event.end_time ?? '',
    });

    setGeneratedCode(event.event_code);
    setGeneratedQR(payload);

    showMessage(`QR code loaded for ${event.title}.`, 'success');
  };

  const handleCancelEdit = () => {
    resetForm();
    setStatusMessage(null);
  };

  const filteredEvents = events.filter((event) => {
    const matchesFilter = filter === 'all' || event.status === filter;
    const query = search.trim().toLowerCase();

    const matchesSearch =
      !query ||
      event.title.toLowerCase().includes(query) ||
      event.event_code.toLowerCase().includes(query) ||
      (event.venue ?? '').toLowerCase().includes(query) ||
      (event.description ?? '').toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  const openCount = events.filter((event) => event.status === 'open').length;
  const closedCount = events.filter((event) => event.status === 'closed').length;

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
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.heroIcon}>
            <Ionicons name="school-outline" size={27} color="#FFFFFF" />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroEyebrow}>TEACHER WORKSPACE</Text>
            <Text style={styles.heroTitle}>Event Management</Text>
            <Text style={styles.heroSubtitle}>
              Create events and manage attendance sessions.
            </Text>
          </View>
        </View>

        <View style={styles.heroDivider} />

        <View style={styles.heroFooter}>
          <Ionicons
            name="shield-checkmark-outline"
            size={16}
            color="#E7D8FF"
          />
          <Text style={styles.heroFooterText}>
            Manage your events from one place
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.statIconPurple]}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.statValue}>{events.length}</Text>
          <Text style={styles.statLabel}>Total Events</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.statIconGreen]}>
            <Ionicons
              name="radio-button-on-outline"
              size={20}
              color={COLORS.success}
            />
          </View>
          <Text style={styles.statValue}>{openCount}</Text>
          <Text style={styles.statLabel}>Open</Text>
        </View>

        <View style={styles.statCard}>
          <View style={[styles.statIcon, styles.statIconRed]}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color={COLORS.danger}
            />
          </View>
          <Text style={styles.statValue}>{closedCount}</Text>
          <Text style={styles.statLabel}>Closed</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <View style={styles.sectionHeading}>
          <View style={styles.sectionHeadingIcon}>
            <Ionicons
              name={editingEvent ? 'create-outline' : 'add-circle-outline'}
              size={23}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.sectionHeadingText}>
            <Text style={styles.sectionTitle}>
              {editingEvent ? 'Edit Event' : 'Create New Event'}
            </Text>
            <Text style={styles.sectionSubtitle}>
              {editingEvent
                ? 'Update your event details'
                : 'Set up a new attendance session'}
            </Text>
          </View>
        </View>

        <Text style={styles.label}>EVENT TITLE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. General Assembly 2026"
          placeholderTextColor={COLORS.muted}
          value={title}
          onChangeText={setTitle}
          maxLength={120}
          returnKeyType="next"
        />

        <Text style={styles.label}>EVENT CODE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. BSIT-GA-2026"
          placeholderTextColor={COLORS.muted}
          value={eventCode}
          onChangeText={(value) =>
            setEventCode(value.toUpperCase().replace(/\s+/g, '-'))
          }
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={30}
          returnKeyType="next"
        />
        <Text style={styles.inputHint}>
          Use 3–30 characters with letters, numbers, and hyphens.
        </Text>

        {/* NEW: EVENT VENUE */}
        <Text style={styles.label}>VENUE</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. School Auditorium"
          placeholderTextColor={COLORS.muted}
          value={venue}
          onChangeText={setVenue}
          maxLength={150}
          returnKeyType="next"
        />

        {/* NEW: EVENT DESCRIPTION */}
        <Text style={styles.label}>DESCRIPTION</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Enter the event description..."
          placeholderTextColor={COLORS.muted}
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.inputHint}>
          Briefly explain the purpose and details of the event.
        </Text>

        <Text style={styles.label}>START DATE AND TIME</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.dateButton}
          onPress={() => {
            setStartPickerMode('date');
            setShowStartPicker(true);
          }}
        >
          <View style={styles.dateIcon}>
            <Ionicons
              name="calendar-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateText}>{startDate.toLocaleString()}</Text>
            <Text style={styles.dateHint}>Tap to change start time</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.muted}
          />
        </Pressable>

        {showStartPicker && (
          <DateTimePicker
            value={startDate}
            mode={startPickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (Platform.OS !== 'ios') setShowStartPicker(false);

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

        <Text style={styles.label}>END DATE AND TIME</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.dateButton}
          onPress={() => {
            setEndPickerMode('date');
            setShowEndPicker(true);
          }}
        >
          <View style={styles.dateIcon}>
            <Ionicons
              name="time-outline"
              size={19}
              color={COLORS.primary}
            />
          </View>
          <View style={styles.dateTextContainer}>
            <Text style={styles.dateText}>{endDate.toLocaleString()}</Text>
            <Text style={styles.dateHint}>Tap to change end time</Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={COLORS.muted}
          />
        </Pressable>

        {showEndPicker && (
          <DateTimePicker
            value={endDate}
            mode={endPickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(event, date) => {
              if (Platform.OS !== 'ios') setShowEndPicker(false);

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
          title={
            saving
              ? 'Saving Event...'
              : editingEvent
                ? 'Save Event Changes'
                : 'Save & Generate QR'
          }
          icon={editingEvent ? 'save-outline' : 'qr-code-outline'}
          loading={saving}
          disabled={saving}
          onPress={handleCreateEvent}
        />

        {editingEvent ? (
          <Pressable
            accessibilityRole="button"
            style={styles.cancelEditButton}
            onPress={handleCancelEdit}
          >
            <Text style={styles.cancelEditText}>Cancel Editing</Text>
          </Pressable>
        ) : null}
      </View>

      {generatedCode && generatedQR ? (
        <View style={styles.qrResultCard}>
          <View style={styles.qrResultHeader}>
            <View style={styles.qrResultIcon}>
              <Ionicons
                name="checkmark-circle"
                size={25}
                color={COLORS.success}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.qrResultTitle}>Attendance QR Ready</Text>
              <Text style={styles.qrResultSubtitle}>
                Students can scan this code using the Scan QR tab.
              </Text>
            </View>
          </View>

          <View style={styles.codeBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.codeLabel}>EVENT CODE</Text>
              <Text style={styles.codeText}>{generatedCode}</Text>
            </View>
            <Ionicons
              name="key-outline"
              size={23}
              color="#E7D8FF"
            />
          </View>

          <View style={styles.qrSection}>
            <View style={styles.qrBox}>
              <QRCode value={generatedQR} size={210} />
            </View>
            <Text style={styles.qrFootnote}>
              Keep this QR code available during your event.
            </Text>
          </View>
        </View>
      ) : null}

      <View style={styles.eventsSection}>
        <View style={styles.eventsHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Your Events</Text>
            <Text style={styles.sectionSubtitle}>
              View and manage events created by your account.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh events"
            style={styles.refreshButton}
            onPress={() => void loadEvents()}
            disabled={eventsLoading}
          >
            <Ionicons
              name="refresh-outline"
              size={21}
              color={COLORS.primary}
            />
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color={COLORS.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search title, code, venue or description..."
            placeholderTextColor={COLORS.muted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons
                name="close-circle"
                size={19}
                color={COLORS.muted}
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.filterRow}>
          {(['all', 'open', 'closed'] as const).map((value) => {
            const selected = filter === value;

            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setFilter(value)}
                style={[
                  styles.filterButton,
                  selected && styles.filterButtonSelected,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    selected && styles.filterTextSelected,
                  ]}
                >
                  {value === 'all'
                    ? `All (${events.length})`
                    : value === 'open'
                      ? `Open (${openCount})`
                      : `Closed (${closedCount})`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {eventsLoading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={styles.mutedText}>Loading your events...</Text>
          </View>
        ) : filteredEvents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons
                name="calendar-outline"
                size={30}
                color={COLORS.primary}
              />
            </View>
            <Text style={styles.emptyTitle}>
              {events.length === 0 ? 'No events yet' : 'No matching events'}
            </Text>
            <Text style={styles.emptyText}>
              {events.length === 0
                ? 'Create your first attendance event using the form above.'
                : 'Try another search term or change the status filter.'}
            </Text>
          </View>
        ) : (
          filteredEvents.map((event) => {
            const isOpen = event.status === 'open';
            const isChanging = changingEventId === event.id;

            return (
              <View key={event.id} style={styles.eventCard}>
                <View style={styles.eventCardTop}>
                  <View style={styles.eventIcon}>
                    <Ionicons
                      name="calendar"
                      size={22}
                      color="#FFFFFF"
                    />
                  </View>

                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{event.title}</Text>
                    <Text style={styles.eventCode}>{event.event_code}</Text>
                  </View>

                  <View
                    style={[
                      styles.statusPill,
                      isOpen ? styles.openPill : styles.closedPill,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        isOpen ? styles.openDot : styles.closedDot,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        isOpen ? styles.openText : styles.closedText,
                      ]}
                    >
                      {event.status.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* NEW: DISPLAY SAVED VENUE */}
                {event.venue ? (
                  <View style={styles.eventDateRow}>
                    <Ionicons
                      name="location-outline"
                      size={17}
                      color={COLORS.muted}
                    />
                    <Text style={styles.eventDateText}>
                      Venue: {event.venue}
                    </Text>
                  </View>
                ) : null}

                {/* NEW: DISPLAY SAVED DESCRIPTION */}
                {event.description ? (
                  <View style={styles.eventDateRow}>
                    <Ionicons
                      name="document-text-outline"
                      size={17}
                      color={COLORS.muted}
                    />
                    <Text style={styles.eventDateText}>
                      Description: {event.description}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.eventDateRow}>
                  <Ionicons
                    name="play-circle-outline"
                    size={17}
                    color={COLORS.muted}
                  />
                  <Text style={styles.eventDateText}>
                    Starts: {formatDate(event.start_time)}
                  </Text>
                </View>

                <View style={styles.eventDateRow}>
                  <Ionicons
                    name="stop-circle-outline"
                    size={17}
                    color={COLORS.muted}
                  />
                  <Text style={styles.eventDateText}>
                    Ends: {formatDate(event.end_time)}
                  </Text>
                </View>

                <View style={styles.eventActions}>
                  <Pressable
                    accessibilityRole="button"
                    style={styles.secondaryAction}
                    onPress={() => handleViewQR(event)}
                  >
                    <Ionicons
                      name="qr-code-outline"
                      size={17}
                      color={COLORS.primary}
                    />
                    <Text style={styles.secondaryActionText}>View QR</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    style={styles.secondaryAction}
                    onPress={() => beginEdit(event)}
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={COLORS.primary}
                    />
                    <Text style={styles.secondaryActionText}>Edit</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    disabled={isChanging}
                    style={[
                      styles.statusAction,
                      isOpen ? styles.closeAction : styles.reopenAction,
                    ]}
                    onPress={() => void handleEventStatus(event)}
                  >
                    {isChanging ? (
                      <ActivityIndicator
                        size="small"
                        color={isOpen ? COLORS.danger : COLORS.success}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name={
                            isOpen
                              ? 'lock-closed-outline'
                              : 'lock-open-outline'
                          }
                          size={16}
                          color={isOpen ? COLORS.danger : COLORS.success}
                        />
                        <Text
                          style={[
                            styles.statusActionText,
                            isOpen ? styles.closedText : styles.openText,
                          ]}
                        >
                          {isOpen ? 'Close' : 'Reopen'}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })
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
    padding: 18,
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
  heroCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: {
    flex: 1,
  },
  heroEyebrow: {
    fontSize: 10,
    letterSpacing: 1.5,
    fontWeight: '800',
    color: '#E7D8FF',
    marginBottom: 5,
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#F0E7FF',
    marginTop: 5,
  },
  heroDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 17,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroFooterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E7D8FF',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 0,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIconPurple: {
    backgroundColor: COLORS.primaryLight,
  },
  statIconGreen: {
    backgroundColor: COLORS.successLight,
  },
  statIconRed: {
    backgroundColor: COLORS.dangerLight,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  formCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 22,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 7,
  },
  sectionHeadingIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeadingText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
    color: COLORS.textSecondary,
    marginTop: 17,
    marginBottom: 8,
  },
  input: {
    minHeight: 49,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 11,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  multilineInput: {
    minHeight: 110,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  dateButton: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    paddingVertical: 10,
    gap: 11,
  },
  dateIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTextContainer: {
    flex: 1,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateHint: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 4,
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
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  cancelEditButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    marginTop: 8,
  },
  cancelEditText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  qrResultCard: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 17,
    marginBottom: 22,
  },
  qrResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  qrResultIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrResultTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  qrResultSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkBackground,
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  codeLabel: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '800',
    color: COLORS.darkMuted,
    marginBottom: 6,
  },
  codeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  qrSection: {
    alignItems: 'center',
    marginTop: 20,
  },
  qrBox: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrFootnote: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    color: COLORS.textSecondary,
  },
  eventsSection: {
    marginTop: 2,
  },
  eventsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 15,
  },
  refreshButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: COLORS.card,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 13,
    paddingVertical: 10,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  filterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  loadingCard: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 26,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 25,
  },
  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  eventCard: {
    backgroundColor: COLORS.card,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    marginBottom: 11,
  },
  eventCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 14,
  },
  eventIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  eventCode: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 4,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 20,
  },
  openPill: {
    backgroundColor: COLORS.successLight,
  },
  closedPill: {
    backgroundColor: COLORS.dangerLight,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  openDot: {
    backgroundColor: COLORS.success,
  },
  closedDot: {
    backgroundColor: COLORS.danger,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  openText: {
    color: COLORS.success,
  },
  closedText: {
    color: COLORS.danger,
  },
  eventDateRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  eventDateText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textSecondary,
  },
  eventActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    marginTop: 7,
  },
  secondaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: COLORS.background,
  },
  secondaryActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  statusAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  closeAction: {
    backgroundColor: COLORS.dangerLight,
  },
  reopenAction: {
    backgroundColor: COLORS.successLight,
  },
  statusActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  mutedText: {
    marginTop: 10,
    fontSize: 13,
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