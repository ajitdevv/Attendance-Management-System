import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
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
  const { data, error } = await supabase.functions.invoke('employee-login', {
    body: { username, password }
  });

  if (error) throw error;
  if (!data?.session) throw new Error(data?.error || 'Unable to start employee session.');

  const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token
  });

  if (setSessionError || !sessionData.session) {
    throw setSessionError || new Error('Unable to save employee session.');
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== 'employee') {
    await supabase.auth.signOut();
    throw new Error('This account is not authorized for the employee dashboard.');
  }

  return { session: sessionData.session, profile };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
