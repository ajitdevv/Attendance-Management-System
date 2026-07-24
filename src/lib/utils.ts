import type { AttendanceStatus, Employee, EmployeeStatus } from '../types';

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function formatDate(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(`${value}T00:00:00`));
}

export function formatTime(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(value));
}

export function getErrorMessage(error: unknown, fallback = 'Something went wrong.'): string {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

export function generatePassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function nextEmployeeIdFromList(employees: Employee[]): string {
  const max = employees.reduce((highest, employee) => {
    const number = Number(employee.employee_id.replace(/\D/g, ''));
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);

  return `EMP${String(max + 1).padStart(3, '0')}`;
}

export function statusTone(status: EmployeeStatus | AttendanceStatus): 'green' | 'red' | 'amber' | 'slate' {
  if (status === 'active' || status === 'present') return 'green';
  if (status === 'inactive' || status === 'absent') return 'red';
  return 'slate';
}

export function normalizeEmployeeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function employeeAuthEmail(username: string): string {
  return `${normalizeEmployeeCode(username).toLowerCase()}@employees.ams.local`;
}
