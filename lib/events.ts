
import { supabase } from '@/lib/supabase';

export type Event = {
  eventId: string;
  title: string;
  start: string;
  end: string;
  venue?: string;
  description?: string;
};

export type CloudEvent = {
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

const EVENT_COLUMNS =
  'id, event_code, title, start_time, end_time, created_by, created_at, venue, description, status';

export async function createEvent(
  event: Event
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      error: 'You must be logged in to create an event.',
    };
  }

  if (!event.eventId.trim() || !event.title.trim()) {
    return {
      error: 'Event code and title are required.',
    };
  }

  if (
    event.start &&
    event.end &&
    new Date(event.end).getTime() <=
      new Date(event.start).getTime()
  ) {
    return {
      error: 'End time must be later than start time.',
    };
  }

  const { error } = await supabase.from('events').insert({
    event_code: event.eventId.trim(),
    title: event.title.trim(),
    start_time: event.start || null,
    end_time: event.end || null,
    created_by: user.id,
    venue: event.venue?.trim() || null,
    description: event.description?.trim() || null,
    status: 'open',
  });

  if (error) {
    if (error.code === '23505') {
      return {
        error: 'This event code already exists. Please try again.',
      };
    }

    return { error: error.message };
  }

  return { error: null };
}

export async function getEventByCode(
  code: string
): Promise<CloudEvent | null> {
  const normalizedCode = code.trim();

  if (!normalizedCode) {
    return null;
  }

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('event_code', normalizedCode)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}

export async function getEventById(
  eventId: string
): Promise<CloudEvent | null> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('id', eventId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as CloudEvent;
}

export async function getEventsByTeacher(
  teacherId: string
): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('created_by', teacherId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    console.error(
      'Failed to load teacher events:',
      error?.message
    );

    return [];
  }

  return data as CloudEvent[];
}

/**
 * Gets open events for the student Home screen.
 * Events that have already ended are excluded.
 */
export async function getAvailableEvents(): Promise<CloudEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('status', 'open')
    .order('start_time', {
      ascending: true,
      nullsFirst: false,
    });

  if (error) {
    console.error(
      'Failed to load available events:',
      error.message
    );

    throw new Error(
      'Unable to load available events. Check your connection or event access permissions.'
    );
  }

  const now = Date.now();

  return ((data ?? []) as CloudEvent[]).filter((event) => {
    if (!event.end_time) {
      return true;
    }

    const endTime = new Date(event.end_time).getTime();

    // Keep events with an invalid/unparseable end time visible
    // so a date-format issue does not silently hide an event.
    return Number.isNaN(endTime) || endTime >= now;
  });
}

export async function closeEvent(
  eventId: string
): Promise<{ error: string | null }> {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      error: 'You must be logged in.',
    };
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('id', eventId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function reopenEvent(
  eventId: string
): Promise<{ error: string | null }> {
  const {
    data: userData,
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return {
      error: 'You must be logged in.',
    };
  }

  const { error } = await supabase
    .from('events')
    .update({ status: 'open' })
    .eq('id', eventId);

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}
