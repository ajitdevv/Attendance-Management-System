import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { employeeAuthEmail } from '../lib/utils';
import type { AppUserProfile } from '../types';

export async function getCurrentProfile(): Promise<AppUserProfile | null> {
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, role, created_at')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data as AppUserProfile;
}

export async function signInAdmin(email: string, password: string): Promise<{ session: Session; profile: AppUserProfile }> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error || new Error('Unable to start admin session.');

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'admin') {
    await supabase.auth.signOut();
    throw new Error('This account is not authorized for the admin dashboard.');
  }

  return { session: data.session, profile };
}

export async function signInEmployee(
  username: string,
  password: string
): Promise<{ session: Session; profile: AppUserProfile }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: employeeAuthEmail(username),
    password
  });

  if (error || !data.session) throw error || new Error('Unable to start employee session.');

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'employee') {
    await supabase.auth.signOut();
    throw new Error('This account is not authorized for the employee dashboard.');
  }

  return { session: data.session, profile };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
