
import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

// Restore the persisted session.
void supabase.auth.getSession().then(({ data, error }) => {
  globalSession = error ? null : data.session;
  globalUser = globalSession?.user ?? null;
  globalLoading = false;
  notify();
});

// Keep authentication state synchronized with Supabase.
supabase.auth.onAuthStateChange((_event, session) => {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
});

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
  school_id: string;
};

export async function signUp(
  email: string,
  password: string,
  profile: SignUpProfile
) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedName = profile.full_name.trim();
  const normalizedSchoolId = profile.school_id.trim();

  const role =
    profile.role === 'teacher' ? 'teacher' : 'student';

  if (!normalizedName) {
    return {
      data: { user: null, session: null },
      error: new Error('Full name is required.'),
    };
  }

  if (!normalizedSchoolId) {
    return {
      data: { user: null, session: null },
      error: new Error('School ID is required.'),
    };
  }

  if (normalizedSchoolId.length > 50) {
    return {
      data: { user: null, session: null },
      error: new Error(
        'School ID cannot exceed 50 characters.'
      ),
    };
  }

  if (!normalizedEmail) {
    return {
      data: { user: null, session: null },
      error: new Error('Email is required.'),
    };
  }

  if (password.length < 6) {
    return {
      data: { user: null, session: null },
      error: new Error(
        'Password must be at least 6 characters.'
      ),
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        full_name: normalizedName,
        role,
        school_id: normalizedSchoolId,
      },
    },
  });

  if (error) {
    return { data, error };
  }

  // Update the existing profile record when one is available.
  // Profile creation may instead be handled by a database trigger.
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: normalizedName,
        school_id: normalizedSchoolId,
      })
      .eq('id', data.user.id);

    if (profileError) {
      console.error(
        'Profile update failed:',
        profileError.message
      );
    }
  }

  if (data.session) {
    setAuth(data.session);
  }

  return { data, error: null };
}

export async function signIn(
  email: string,
  password: string
) {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

  if (!error && data.session) {
    setAuth(data.session);
  }

  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (!error) {
    setAuth(null);
  } 

  return { error };
}
