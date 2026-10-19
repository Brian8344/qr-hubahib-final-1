
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

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, school_id, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error(
      'Failed to fetch profile:',
      error.message
    );
    return null;
  }

  if (!data) {
    return null;
  }

  return data as Profile;
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
      error: 'Please sign in to update your profile.',
    };
  }

  if (user.id !== userId) {
    return {
      error: 'You can only update your own profile.',
    };
  }

  const profileUpdates: {
    full_name?: string;
    school_id?: string;
  } = {};

  // Validate and prepare the full name.
  if (updates.full_name !== undefined) {
    const fullName = updates.full_name.trim();

    if (!fullName) {
      return {
        error: 'Full name cannot be empty.',
      };
    }

    if (fullName.length > 100) {
      return {
        error: 'Full name cannot exceed 100 characters.',
      };
    }

    profileUpdates.full_name = fullName;
  }

  // Validate and prepare the School ID.
  if (updates.school_id !== undefined) {
    const schoolId = updates.school_id.trim();

    if (!schoolId) {
      return {
        error: 'School ID cannot be empty.',
      };
    }

    if (schoolId.length > 50) {
      return {
        error: 'School ID cannot exceed 50 characters.',
      };
    }

    profileUpdates.school_id = schoolId;
  }

  // Return successfully if there is nothing to update.
  if (Object.keys(profileUpdates).length === 0) {
    return { error: null };
  }

  const { error } = await supabase
    .from('profiles')
    .update(profileUpdates)
    .eq('id', user.id);

  if (error) {
    console.error(
      'Failed to update profile:',
      error.message
    );

    return {
      error: error.message,
    };
  }

  return { error: null };
}
