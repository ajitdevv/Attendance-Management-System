export type AppRole = 'admin' | 'employee';
export type EmployeeStatus = 'active' | 'inactive';
export type AttendanceStatus = 'present' | 'absent';

export type AppUserProfile = {
  id: string;
  username: string;
  role: AppRole;
  created_at: string;
};

export type Employee = {
  id: string;
  user_id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department: string;
  joining_date: string;
  status: EmployeeStatus;
  created_at: string;
  updated_at: string;
  users?: {
    username: string;
  } | null;
};

export type EmployeeFormValues = {
  fullName: string;
  employeeId: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  department: string;
  joiningDate: string;
  status: EmployeeStatus;
};

export type Attendance = {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time: string;
  check_out_time: string | null;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
  employees?: {
    id: string;
    employee_id: string;
    full_name: string;
    department: string;
  } | null;
};

export type AdminAttendanceRow = {
  id: string;
  employeeRecordId: string;
  employeeName: string;
  employeeId: string;
  department: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: AttendanceStatus;
};

export type DashboardSummary = {
  total_employees: number;
  today_attendance: number;
  present_employees: number;
  absent_employees: number;
};

export type GeneratedCredentials = {
  username: string;
  password: string;
};
