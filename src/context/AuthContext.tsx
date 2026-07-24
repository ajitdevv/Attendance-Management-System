import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getCurrentProfile, signInAdmin as signInAdminRequest, signInEmployee as signInEmployeeRequest, signOut as signOutRequest } from '../services/auth';
import type { AppUserProfile } from '../types';

type AuthContextValue = {
  session: Session | null;
  profile: AppUserProfile | null;
  loading: boolean;
  signInAdmin: (email: string, password: string) => Promise<AppUserProfile>;
  signInEmployee: (username: string, password: string) => Promise<AppUserProfile>;
  refreshProfile: () => Promise<AppUserProfile | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const nextProfile = await getCurrentProfile();
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      if (data.session) {
        try {
          const nextProfile = await getCurrentProfile();
          if (mounted) setProfile(nextProfile);
        } catch {
          if (mounted) setProfile(null);
        }
      }

      if (mounted) setLoading(false);
    }

    initializeSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      getCurrentProfile()
        .then((nextProfile) => setProfile(nextProfile))
        .catch(() => setProfile(null))
        .finally(() => setLoading(false));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const { session: nextSession, profile: nextProfile } = await signInAdminRequest(email, password);
    setSession(nextSession);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const signInEmployee = useCallback(async (username: string, password: string) => {
    const { session: nextSession, profile: nextProfile } = await signInEmployeeRequest(username, password);
    setSession(nextSession);
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const signOut = useCallback(async () => {
    await signOutRequest();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, signInAdmin, signInEmployee, refreshProfile, signOut }),
    [session, profile, loading, signInAdmin, signInEmployee, refreshProfile, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
