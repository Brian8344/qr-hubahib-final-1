
import { supabase } from './supabase';

export type Role = 'student' | 'teacher' | 'admin';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== userId) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: { full_name: string }
): Promise<{ error: string | null }> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user || user.id !== userId) {
    return {
      error: 'You can only update your own profile.',
    };
  }

  const fullName = updates.full_name.trim();

  if (!fullName) {
    return {
      error: 'Full name is required.',
    };
  }

  if (fullName.length > 100) {
    return {
      error: 'Full name must not exceed 100 characters.',
    };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', user.id);

  return {
    error: error?.message ?? null,
  };
}
