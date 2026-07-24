import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/admin.ts';
import {
  authEmailForUsername,
  cleanText,
  generatePassword,
  requireText,
  validateEmployeeCode,
  validatePassword,
  validateStatus
} from '../_shared/validation.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const { adminClient } = await requireAdmin(req);
    const payload = await req.json();

    const fullName = requireText(payload.fullName, 'Full name', 2);
    const phone = cleanText(payload.phone) || null;
    const department = requireText(payload.department, 'Department', 2);
    const joiningDate = requireText(payload.joiningDate, 'Joining date');
    const status = validateStatus(payload.status);

    let employeeId = cleanText(payload.employeeId);
    if (!employeeId) {
      const { data: nextCode, error: codeError } = await adminClient.rpc('next_employee_code');
      if (codeError || !nextCode) throw new Error(codeError?.message || 'Could not generate employee ID.');
      employeeId = nextCode;
    }
    employeeId = validateEmployeeCode(employeeId);

    const username = validateEmployeeCode(cleanText(payload.username) || employeeId, 'Username');
    const password = validatePassword(cleanText(payload.password) || generatePassword());
    const email = authEmailForUsername(username);

    const { data: createdAuth, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
        role: 'employee'
      }
    });

    if (authError || !createdAuth.user) {
      throw new Error(authError?.message || 'Could not create employee auth account.');
    }

    const authUserId = createdAuth.user.id;

    try {
      const { data: passwordHash, error: hashError } = await adminClient.rpc('hash_employee_password', {
        plain_password: password
      });

      if (hashError || !passwordHash) throw new Error(hashError?.message || 'Could not hash employee password.');

      const { error: userError } = await adminClient.from('users').insert({
        id: authUserId,
        username,
        password_hash: passwordHash,
        role: 'employee'
      });

      if (userError) throw new Error(userError.message);

      const { data: employee, error: employeeError } = await adminClient
        .from('employees')
        .insert({
          user_id: authUserId,
          employee_id: employeeId,
          full_name: fullName,
          phone,
          department,
          joining_date: joiningDate,
          status
        })
        .select('id, user_id, employee_id, full_name, phone, department, joining_date, status, created_at, updated_at')
        .single();

      if (employeeError || !employee) throw new Error(employeeError?.message || 'Could not create employee profile.');

      return jsonResponse({
        employee: {
          ...employee,
          username
        },
        credentials: {
          username,
          password
        }
      }, 201);
    } catch (error) {
      await adminClient.auth.admin.deleteUser(authUserId);
      throw error;
    }
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error instanceof Error ? error.message : 'Unable to create employee.', 400);
  }
});
