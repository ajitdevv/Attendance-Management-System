import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { normalizeEmployeeCode } from '../lib/utils';
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
  const normalizedUsername = normalizeEmployeeCode(username);
  const { data: employeeEmail, error: lookupError } = await supabase.rpc('employee_login_email', {
    input_username: normalizedUsername
  });

  if (lookupError) throw lookupError;
  if (!employeeEmail) throw new Error('Invalid employee username or inactive account.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: employeeEmail,
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
