
import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  school_id: string | null;
  role: Role;
};

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  if (!userId) {
    return null;
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, school_id, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load profile:', error.message);
    throw new Error('Unable to load your profile.');
  }

  return data as Profile | null;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    school_id?: string;
  }
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: 'Please sign in before editing your profile.',
    };
  }

  if (user.id !== userId) {
    return {
      error: 'You can only edit your own profile.',
    };
  }

  const profileUpdates: {
    full_name?: string;
    school_id?: string;
  } = {};

  if (updates.full_name !== undefined) {
    const fullName = updates.full_name.trim();

    if (!fullName) {
      return { error: 'Full name is required.' };
    }

    if (fullName.length > 100) {
      return {
        error: 'Full name cannot exceed 100 characters.',
      };
    }

    profileUpdates.full_name = fullName;
  }

  if (updates.school_id !== undefined) {
    const schoolId = updates.school_id.trim();

    if (!schoolId) {
      return { error: 'School ID is required.' };
    }

    if (schoolId.length > 50) {
      return {
        error: 'School ID cannot exceed 50 characters.',
      };
    }

    profileUpdates.school_id = schoolId;
  }

  if (Object.keys(profileUpdates).length === 0) {
    return { error: 'No profile changes were provided.' };
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', user.id)
    .select('id');

  if (error) {
    console.error('Failed to update profile:', error.message);

    return {
      error: error.message,
    };
  }

  if (!data || data.length === 0) {
    return {
      error: 'Profile was not updated. Check your database permissions.',
    };
  }

  return { error: null };
}
