import { supabase } from '../lib/supabase';
import type { Employee, EmployeeFormValues, GeneratedCredentials } from '../types';

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
  const { data, error } = await supabase.functions.invoke('create-employee', {
    body: values
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function updateEmployee(
  id: string,
  values: Partial<Omit<EmployeeFormValues, 'password' | 'username'>>
): Promise<Employee> {
  const { data, error } = await supabase.functions.invoke('update-employee', {
    body: { id, ...values }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.employee as Employee;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-employee', {
    body: { id }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}

export async function resetEmployeePassword(id: string): Promise<GeneratedCredentials> {
  const { data, error } = await supabase.functions.invoke('reset-employee-password', {
    body: { id }
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data.credentials as GeneratedCredentials;
}
