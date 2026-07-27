import { supabase } from '../lib/supabase';
import { todayISO } from '../lib/utils';
import type { AdminAttendanceRow, Attendance, DashboardSummary, Employee } from '../types';

export async function getDashboardSummary(date = todayISO()): Promise<DashboardSummary> {
  const { data, error } = await supabase.rpc('employee_attendance_summary', {
    target_date: date
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;

  return {
    total_employees: Number(row?.total_employees ?? 0),
    today_attendance: Number(row?.today_attendance ?? 0),
    present_employees: Number(row?.present_employees ?? 0),
    absent_employees: Number(row?.absent_employees ?? 0)
  };
}

export async function listRecentAttendance(limit = 8): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, employee_id, attendance_date, check_in_time, check_out_time, status, created_at, updated_at, employees(id, employee_id, full_name, department)')
    .order('check_in_time', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []).map((row) => ({
    ...row,
    employees: Array.isArray(row.employees) ? row.employees[0] ?? null : row.employees ?? null
  })) as unknown as Attendance[];
}

export async function listAdminAttendanceRows(date = todayISO()): Promise<AdminAttendanceRow[]> {
  const [{ data: employees, error: employeeError }, { data: attendance, error: attendanceError }] = await Promise.all([
    supabase
      .from('employees')
      .select('id, user_id, employee_id, full_name, email, phone, department, joining_date, status, created_at, updated_at')
      .order('full_name', { ascending: true }),
    supabase
      .from('attendance')
      .select('id, employee_id, attendance_date, check_in_time, check_out_time, status, created_at, updated_at')
      .eq('attendance_date', date)
  ]);

  if (employeeError) throw employeeError;
  if (attendanceError) throw attendanceError;

  const attendanceByEmployee = new Map((attendance || []).map((record) => [record.employee_id, record as Attendance]));

  return ((employees || []) as Employee[]).map((employee) => {
    const record = attendanceByEmployee.get(employee.id);

    return {
      id: record?.id || `${employee.id}-${date}`,
      employeeRecordId: employee.id,
      employeeName: employee.full_name,
      employeeId: employee.employee_id,
      department: employee.department,
      date,
      checkInTime: record?.check_in_time || null,
      checkOutTime: record?.check_out_time || null,
      status: record?.status || 'absent'
    };
  });
}

export async function getMyEmployeeProfile(): Promise<Employee | null> {
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from('employees')
    .select('id, user_id, employee_id, full_name, email, phone, department, joining_date, status, created_at, updated_at')
    .eq('user_id', user.id)
    .single();

  if (error) throw error;
  return data as Employee;
}

export async function getTodayAttendance(employeeId: string, date = todayISO()): Promise<Attendance | null> {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, employee_id, attendance_date, check_in_time, check_out_time, status, created_at, updated_at')
    .eq('employee_id', employeeId)
    .eq('attendance_date', date)
    .maybeSingle();

  if (error) throw error;
  return (data as Attendance | null) || null;
}

export async function checkInToday(): Promise<Attendance> {
  const { data, error } = await supabase.rpc('check_in_today');
  if (error) throw error;
  return data as Attendance;
}

export async function checkOutToday(): Promise<Attendance> {
  const { data, error } = await supabase.rpc('check_out_today');
  if (error) throw error;
  return data as Attendance;
}

export async function listMyAttendanceHistory(
  employeeId: string,
  options: { date?: string; page?: number; pageSize?: number } = {}
): Promise<{ rows: Attendance[]; count: number }> {
  const page = options.page ?? 1;
  const pageSize = options.pageSize ?? 8;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('attendance')
    .select('id, employee_id, attendance_date, check_in_time, check_out_time, status, created_at, updated_at', {
      count: 'exact'
    })
    .eq('employee_id', employeeId)
    .order('attendance_date', { ascending: false })
    .range(from, to);

  if (options.date) {
    query = query.eq('attendance_date', options.date);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    rows: (data || []) as Attendance[],
    count: count || 0
  };
}
