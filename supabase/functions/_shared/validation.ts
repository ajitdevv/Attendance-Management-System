export function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function normalizeEmployeeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function requireText(value: unknown, label: string, minLength = 1): string {
  const text = cleanText(value);
  if (text.length < minLength) {
    throw new Error(`${label} is required.`);
  }
  return text;
}

export function validateEmployeeCode(value: string, label = 'Employee ID'): string {
  const normalized = normalizeEmployeeCode(value);
  if (!/^EMP\d{3,}$/.test(normalized)) {
    throw new Error(`${label} must use the format EMP001.`);
  }
  return normalized;
}

export function validateStatus(value: unknown): 'active' | 'inactive' {
  if (value === 'inactive') {
    return 'inactive';
  }
  return 'active';
}

export function validatePassword(value: string): string {
  if (value.length < 10) {
    throw new Error('Employee password must be at least 10 characters.');
  }
  return value;
}

export function generatePassword(length = 14): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

export function authEmailForUsername(username: string): string {
  const domain = Deno.env.get('EMPLOYEE_AUTH_EMAIL_DOMAIN') || 'employees.ams.local';
  return `${username.toLowerCase()}@${domain}`;
}
