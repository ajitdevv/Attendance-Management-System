import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { createAdminClient, createAnonClient } from '../_shared/admin.ts';
import { authEmailForUsername, cleanText, requireText } from '../_shared/validation.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const payload = await req.json();
    const username = requireText(payload.username, 'Username').toUpperCase();
    const password = requireText(payload.password, 'Password');

    const adminClient = createAdminClient();
    const { data: verified, error: verifyError } = await adminClient.rpc('verify_employee_login', {
      input_username: username,
      plain_password: password
    });

    if (verifyError) throw new Error(verifyError.message);
    if (!verified || verified.length === 0) {
      return errorResponse('Invalid username or password.', 401);
    }

    const profile = verified[0];
    if (profile.role !== 'employee' || profile.employee_status !== 'active') {
      return errorResponse('This employee account is inactive or unauthorized.', 403);
    }

    const anonClient = createAnonClient();
    const { data: loginData, error: loginError } = await anonClient.auth.signInWithPassword({
      email: authEmailForUsername(cleanText(profile.username || username)),
      password
    });

    if (loginError || !loginData.session) {
      return errorResponse('Unable to start employee session.', 401);
    }

    return jsonResponse({
      session: loginData.session,
      user: loginData.user,
      profile: {
        id: profile.user_id,
        username: profile.username,
        role: profile.role
      }
    });
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Unable to login employee.', 400);
  }
});
