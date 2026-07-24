import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/admin.ts';
import { cleanText, generatePassword, requireText, validatePassword } from '../_shared/validation.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const { adminClient } = await requireAdmin(req);
    const payload = await req.json();
    const id = requireText(payload.id, 'Employee record ID');
    const password = validatePassword(cleanText(payload.password) || generatePassword());

    const { data: employee, error: employeeError } = await adminClient
      .from('employees')
      .select('id, user_id, users(username)')
      .eq('id', id)
      .single();

    if (employeeError || !employee) throw new Error(employeeError?.message || 'Employee not found.');

    const { error: authError } = await adminClient.auth.admin.updateUserById(employee.user_id, { password });
    if (authError) throw new Error(authError.message);

    const { data: passwordHash, error: hashError } = await adminClient.rpc('hash_employee_password', {
      plain_password: password
    });
    if (hashError || !passwordHash) throw new Error(hashError?.message || 'Could not hash employee password.');

    const { error: profileError } = await adminClient
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', employee.user_id);

    if (profileError) throw new Error(profileError.message);

    const usersRelation = employee.users as { username?: string } | Array<{ username?: string }> | null;
    const username = Array.isArray(usersRelation) ? usersRelation[0]?.username : usersRelation?.username;

    return jsonResponse({
      credentials: {
        username: username ?? '',
        password
      }
    });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error instanceof Error ? error.message : 'Unable to reset employee password.', 400);
  }
});
