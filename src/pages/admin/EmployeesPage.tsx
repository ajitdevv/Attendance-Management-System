import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Copy, KeyRound, Pencil, Plus, RefreshCw, Search, Trash2, UserRoundCheck, UserRoundX, UsersRound } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { formatDate, generatePassword, getErrorMessage, nextEmployeeIdFromList, normalizeEmployeeCode, statusTone, todayISO } from '../../lib/utils';
import { createEmployee, deleteEmployee, listEmployees, resetEmployeePassword, updateEmployee } from '../../services/employees';
import type { Employee, EmployeeFormValues, EmployeeStatus, GeneratedCredentials } from '../../types';

const defaultForm = (): EmployeeFormValues => ({
  fullName: '',
  employeeId: '',
  username: '',
  password: '',
  phone: '',
  department: '',
  joiningDate: todayISO(),
  status: 'active'
});

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [form, setForm] = useState<EmployeeFormValues>(defaultForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generatedCredentials, setGeneratedCredentials] = useState<GeneratedCredentials | null>(null);

  async function loadEmployees() {
    setLoading(true);
    setError('');
    try {
      const rows = await listEmployees();
      setEmployees(rows);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to load employees.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const filteredEmployees = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return employees;

    return employees.filter((employee) =>
      [employee.full_name, employee.employee_id, employee.department, employee.phone || '', employee.users?.username || '']
        .join(' ')
        .toLowerCase()
        .includes(term)
    );
  }, [employees, search]);

  function openCreateModal() {
    const nextId = nextEmployeeIdFromList(employees);
    setEditingEmployee(null);
    setForm({
      ...defaultForm(),
      employeeId: nextId,
      username: nextId,
      password: generatePassword()
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  }

  function openEditModal(employee: Employee) {
    setEditingEmployee(employee);
    setForm({
      fullName: employee.full_name,
      employeeId: employee.employee_id,
      username: employee.users?.username || employee.employee_id,
      password: '',
      phone: employee.phone || '',
      department: employee.department,
      joiningDate: employee.joining_date,
      status: employee.status
    });
    setError('');
    setSuccess('');
    setModalOpen(true);
  }

  function updateField<K extends keyof EmployeeFormValues>(key: K, value: EmployeeFormValues[K]) {
    setForm((current) => {
      if (key === 'employeeId' && !editingEmployee) {
        const normalized = normalizeEmployeeCode(String(value));
        return { ...current, employeeId: normalized, username: normalized };
      }
      return { ...current, [key]: value };
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, {
          fullName: form.fullName,
          employeeId: form.employeeId,
          phone: form.phone,
          department: form.department,
          joiningDate: form.joiningDate,
          status: form.status
        });
        setSuccess('Employee details updated successfully.');
      } else {
        const result = await createEmployee(form);
        setGeneratedCredentials(result.credentials);
        setSuccess('Employee account created. Share the generated credentials securely.');
      }

      setModalOpen(false);
      await loadEmployees();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to save employee.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(employee: Employee) {
    const confirmed = window.confirm(`Delete ${employee.full_name}? This removes their login and attendance records.`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      await deleteEmployee(employee.id);
      setSuccess('Employee deleted successfully.');
      await loadEmployees();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to delete employee.'));
    }
  }

  async function handleStatusToggle(employee: Employee) {
    setError('');
    setSuccess('');
    const nextStatus: EmployeeStatus = employee.status === 'active' ? 'inactive' : 'active';
    try {
      await updateEmployee(employee.id, {
        status: nextStatus,
        fullName: employee.full_name,
        employeeId: employee.employee_id,
        phone: employee.phone || '',
        department: employee.department,
        joiningDate: employee.joining_date
      });
      setSuccess(`Employee ${nextStatus === 'active' ? 'activated' : 'deactivated'} successfully.`);
      await loadEmployees();
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to update employee status.'));
    }
  }

  async function handleResetPassword(employee: Employee) {
    const confirmed = window.confirm(`Generate a new password for ${employee.full_name}? Their old password will stop working.`);
    if (!confirmed) return;

    setError('');
    setSuccess('');
    try {
      const credentials = await resetEmployeePassword(employee.id);
      setGeneratedCredentials(credentials);
      setSuccess('New password generated. Share it securely with the employee.');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to reset password.'));
    }
  }

  async function copyCredentials() {
    if (!generatedCredentials) return;
    await navigator.clipboard.writeText(`Username: ${generatedCredentials.username}\nPassword: ${generatedCredentials.password}`);
    setSuccess('Credentials copied to clipboard.');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Employee management</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Employees and credentials</h2>
          <p className="mt-2 text-slate-500">Only admins can create, update, deactivate, or delete employee accounts.</p>
        </div>
        <Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>Add employee</Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}

      {generatedCredentials ? (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">Generated credentials</p>
              <p className="mt-2 text-sm text-emerald-900">
                Username: <strong>{generatedCredentials.username}</strong>
              </p>
              <p className="text-sm text-emerald-900">
                Password: <strong>{generatedCredentials.password}</strong>
              </p>
              <p className="mt-2 text-xs text-emerald-700">Store or share this now. Plain passwords are not visible after this message.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" leftIcon={<Copy className="h-4 w-4" />} onClick={copyCredentials}>Copy</Button>
              <Button variant="ghost" onClick={() => setGeneratedCredentials(null)}>Dismiss</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">Employee list</h3>
            <p className="mt-1 text-sm text-slate-500">{employees.length} employee accounts in this company workspace.</p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <Input
              className="pl-9"
              placeholder="Search employees..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search employees"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : filteredEmployees.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-3 font-bold">Employee</th>
                    <th className="pb-3 font-bold">Username</th>
                    <th className="pb-3 font-bold">Phone</th>
                    <th className="pb-3 font-bold">Department</th>
                    <th className="pb-3 font-bold">Joining date</th>
                    <th className="pb-3 font-bold">Status</th>
                    <th className="pb-3 text-right font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id}>
                      <td className="py-4">
                        <p className="font-bold text-slate-950">{employee.full_name}</p>
                        <p className="text-xs text-slate-500">{employee.employee_id}</p>
                      </td>
                      <td className="py-4 font-semibold text-slate-700">{employee.users?.username || employee.employee_id}</td>
                      <td className="py-4 text-slate-600">{employee.phone || '—'}</td>
                      <td className="py-4 text-slate-600">{employee.department}</td>
                      <td className="py-4 text-slate-600">{formatDate(employee.joining_date)}</td>
                      <td className="py-4">
                        <Badge tone={statusTone(employee.status)}>{employee.status}</Badge>
                      </td>
                      <td className="py-4">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" leftIcon={<Pencil className="h-4 w-4" />} onClick={() => openEditModal(employee)}>Edit</Button>
                          <Button size="sm" variant="outline" leftIcon={<KeyRound className="h-4 w-4" />} onClick={() => handleResetPassword(employee)}>Reset</Button>
                          <Button
                            size="sm"
                            variant="outline"
                            leftIcon={employee.status === 'active' ? <UserRoundX className="h-4 w-4" /> : <UserRoundCheck className="h-4 w-4" />}
                            onClick={() => handleStatusToggle(employee)}
                          >
                            {employee.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button size="sm" variant="danger" leftIcon={<Trash2 className="h-4 w-4" />} onClick={() => handleDelete(employee)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<UsersRound className="h-6 w-6" />}
              title="No employees found"
              description="Create the first employee account or adjust your search filter."
              action={<Button leftIcon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>Add employee</Button>}
            />
          )}
        </CardContent>
      </Card>

      <Modal
        open={modalOpen}
        title={editingEmployee ? 'Edit employee' : 'Create employee'}
        description={editingEmployee ? 'Update profile details and account status.' : 'Generate a controlled username and password for a new employee.'}
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={form.fullName} onChange={(event) => updateField('fullName', event.target.value)} required minLength={2} />
            <Input label="Employee ID" value={form.employeeId} onChange={(event) => updateField('employeeId', event.target.value)} required pattern="EMP[0-9]{3,}" />
            <Input label="Username" value={form.username} disabled={Boolean(editingEmployee)} onChange={(event) => updateField('username', event.target.value.toUpperCase())} required />
            {!editingEmployee ? (
              <div className="flex gap-2">
                <Input label="Generated password" value={form.password} onChange={(event) => updateField('password', event.target.value)} required minLength={10} />
                <Button className="mt-6 shrink-0" type="button" variant="outline" aria-label="Generate password" onClick={() => updateField('password', generatePassword())}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <Input label="Phone number" value={form.phone} onChange={(event) => updateField('phone', event.target.value)} placeholder="+1 555 0100" />
            <Input label="Department" value={form.department} onChange={(event) => updateField('department', event.target.value)} required minLength={2} placeholder="Operations" />
            <Input label="Joining date" type="date" value={form.joiningDate} onChange={(event) => updateField('joiningDate', event.target.value)} required />
            <Select
              label="Status"
              value={form.status}
              onChange={(event) => updateField('status', event.target.value as EmployeeStatus)}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' }
              ]}
            />
          </div>
          <Alert tone="info">
            Employee credentials are company generated. There is no employee signup page or employee password reset flow.
          </Alert>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={submitting}>{editingEmployee ? 'Save changes' : 'Create employee'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
