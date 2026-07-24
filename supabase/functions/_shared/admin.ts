import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';
import { corsHeaders } from './cors.ts';

export type AdminContext = {
  adminClient: SupabaseClient;
  adminUserId: string;
};

export function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function createAdminClient(): SupabaseClient {
  return createClient(getRequiredEnv('SUPABASE_URL'), getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export function createAnonClient(): SupabaseClient {
  return createClient(getRequiredEnv('SUPABASE_URL'), getRequiredEnv('SUPABASE_ANON_KEY'), {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function requireAdmin(req: Request): Promise<AdminContext> {
  const authorization = req.headers.get('Authorization') ?? '';
  const token = authorization.replace('Bearer ', '').trim();

  if (!token || token === getRequiredEnv('SUPABASE_ANON_KEY')) {
    throw new Response(JSON.stringify({ error: 'Admin authentication is required.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const adminClient = createAdminClient();
  const { data: authData, error: authError } = await adminClient.auth.getUser(token);

  if (authError || !authData.user) {
    throw new Response(JSON.stringify({ error: 'Invalid or expired admin session.' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('id, role')
    .eq('id', authData.user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    throw new Response(JSON.stringify({ error: 'Admin access is required.' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return { adminClient, adminUserId: authData.user.id };
}
