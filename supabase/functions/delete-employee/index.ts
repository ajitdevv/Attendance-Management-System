import { handleCors, jsonResponse, errorResponse } from '../_shared/cors.ts';
import { requireAdmin } from '../_shared/admin.ts';
import { requireText } from '../_shared/validation.ts';

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return errorResponse('Method not allowed.', 405);
  }

  try {
    const { adminClient } = await requireAdmin(req);
    const payload = await req.json();
    const id = requireText(payload.id, 'Employee record ID');

    const { data: employee, error: findError } = await adminClient
      .from('employees')
      .select('id, user_id')
      .eq('id', id)
      .single();

    if (findError || !employee) throw new Error(findError?.message || 'Employee not found.');

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(employee.user_id);
    if (deleteError) throw new Error(deleteError.message);

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof Response) return error;
    return errorResponse(error instanceof Error ? error.message : 'Unable to delete employee.', 400);
  }
});
