import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/admin.ts';
import { cleanText, requireText, validateEmployeeCode, validateStatus } from '../_shared/validation.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST' && req.method !== 'PATCH') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const { adminClient } = await requireAdmin(req);
    const payload = await req.json();
    const id = requireText(payload.id, 'Employee record ID');

    const updates: Record<string, string | null> = {};

    if ('employeeId' in payload) updates.employee_id = validateEmployeeCode(cleanText(payload.employeeId));
    if ('fullName' in payload) updates.full_name = requireText(payload.fullName, 'Full name', 2);
    if ('phone' in payload) updates.phone = cleanText(payload.phone) || null;
    if ('department' in payload) updates.department = requireText(payload.department, 'Department', 2);
    if ('joiningDate' in payload) updates.joining_date = requireText(payload.joiningDate, 'Joining date');
    if ('status' in payload) updates.status = validateStatus(payload.status);

    const { data: employee, error } = await adminClient
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select('id, user_id, employee_id, full_name, phone, department, joining_date, status, created_at, updated_at, users(username)')
      .single();

    if (error || !employee) throw new Error(error?.message || 'Employee not found.');

    return jsonResponse({ employee });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error instanceof Error ? error.message : 'Unable to update employee.', 400);
  }
});
