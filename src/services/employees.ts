import { signupClient, supabase } from '../lib/supabase';
import { employeeAuthEmail, normalizeEmployeeCode } from '../lib/utils';
import type { Employee, EmployeeFormValues, GeneratedCredentials } from '../types';

async function requireAdminProfile(): Promise<void> {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Admin session is required.');

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (error || data?.role !== 'admin') {
    throw new Error('Only admin can manage employees.');
  }
}

export async function listEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('id, user_id, employee_id, full_name, phone, department, joining_date, status, created_at, updated_at, users(username)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    users: Array.isArray(row.users) ? row.users[0] ?? null : row.users ?? null
  })) as unknown as Employee[];
}

export async function createEmployee(values: EmployeeFormValues): Promise<{
  employee: Employee;
  credentials: GeneratedCredentials;
}> {
  await requireAdminProfile();

  const username = normalizeEmployeeCode(values.username || values.employeeId);
  const employeeId = normalizeEmployeeCode(values.employeeId || username);
  const password = values.password.trim();

  if (!/^EMP\d{3,}$/.test(username) || !/^EMP\d{3,}$/.test(employeeId)) {
    throw new Error('Employee ID and username must use the format EMP001.');
  }

  if (password.length < 10) {
    throw new Error('Employee password must be at least 10 characters.');
  }

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existingUser) throw new Error('This employee username already exists.');

  const { data: existingEmployee } = await supabase
    .from('employees')
    .select('id')
    .eq('employee_id', employeeId)
    .maybeSingle();

  if (existingEmployee) throw new Error('This employee ID already exists.');

  const { data: signupData, error: signupError } = await signupClient.auth.signUp({
    email: employeeAuthEmail(username),
    password,
    options: {
      data: {
        username,
        role: 'employee'
      }
    }
  });

  if (signupError) throw signupError;
  if (!signupData.user?.id) {
    throw new Error('Unable to create employee auth user. Make sure Supabase Auth signup is enabled.');
  }

  const authUserId = signupData.user.id;

  try {
    const { error: userError } = await supabase.from('users').insert({
      id: authUserId,
      username,
      password_hash: 'managed-by-supabase-auth',
      role: 'employee'
    });

    if (userError) throw userError;

    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .insert({
        user_id: authUserId,
        employee_id: employeeId,
        full_name: values.fullName.trim(),
        phone: values.phone.trim() || null,
        department: values.department.trim(),
        joining_date: values.joiningDate,
        status: values.status
      })
      .select('id, user_id, employee_id, full_name, phone, department, joining_date, status, created_at, updated_at')
      .single();

    if (employeeError || !employee) throw employeeError || new Error('Unable to create employee profile.');

    return {
      employee: {
        ...(employee as Employee),
        users: { username }
      },
      credentials: {
        username,
        password
      }
    };
  } catch (error) {
    await supabase.from('users').delete().eq('id', authUserId);
    throw error;
  }
}

export async function updateEmployee(
  id: string,
  values: Partial<Omit<EmployeeFormValues, 'password' | 'username'>>
): Promise<Employee> {
  await requireAdminProfile();

  const { data, error } = await supabase
    .from('employees')
    .update({
      employee_id: values.employeeId ? normalizeEmployeeCode(values.employeeId) : undefined,
      full_name: values.fullName?.trim(),
      phone: values.phone?.trim() || null,
      department: values.department?.trim(),
      joining_date: values.joiningDate,
      status: values.status
    })
    .eq('id', id)
    .select('id, user_id, employee_id, full_name, phone, department, joining_date, status, created_at, updated_at, users(username)')
    .single();

  if (error || !data) throw error || new Error('Employee not found.');

  return {
    ...data,
    users: Array.isArray(data.users) ? data.users[0] ?? null : data.users ?? null
  } as unknown as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  await requireAdminProfile();

  const { data: employee, error: findError } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', id)
    .single();

  if (findError || !employee) throw findError || new Error('Employee not found.');

  const { error } = await supabase.from('users').delete().eq('id', employee.user_id);
  if (error) throw error;
}

export async function resetEmployeePassword(): Promise<GeneratedCredentials> {
  throw new Error('Password reset is not available in frontend signup mode. Delete and recreate the employee or use Supabase Dashboard > Authentication > Users.');
}
