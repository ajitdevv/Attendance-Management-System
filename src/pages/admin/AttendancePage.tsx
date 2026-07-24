import { useEffect, useMemo, useState } from 'react';
import { CalendarSearch, Download, Search } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { formatDate, formatTime, getErrorMessage, statusTone, todayISO } from '../../lib/utils';
import { listAdminAttendanceRows } from '../../services/attendance';
import { listEmployees } from '../../services/employees';
import type { AdminAttendanceRow, AttendanceStatus, Employee } from '../../types';

export function AttendancePage() {
  const [date, setDate] = useState(todayISO());
  const [rows, setRows] = useState<AdminAttendanceRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | AttendanceStatus>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadAttendance(targetDate = date) {
    setLoading(true);
    setError('');
    try {
      const [attendanceRows, employeeRows] = await Promise.all([listAdminAttendanceRows(targetDate), listEmployees()]);
      setRows(attendanceRows);
      setEmployees(employeeRows);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to load attendance records.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAttendance(date);
  }, [date]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesEmployee = employeeFilter === 'all' || row.employeeRecordId === employeeFilter;
      const matchesStatus = statusFilter === 'all' || row.status === statusFilter;
      const matchesSearch =
        !term ||
        [row.employeeName, row.employeeId, row.department, row.status].join(' ').toLowerCase().includes(term);

      return matchesEmployee && matchesStatus && matchesSearch;
    });
  }, [employeeFilter, rows, search, statusFilter]);

  const presentCount = rows.filter((row) => row.status === 'present').length;
  const absentCount = rows.filter((row) => row.status === 'absent').length;

  function downloadCsv() {
    const header = ['Employee Name', 'Employee ID', 'Department', 'Date', 'Check-In Time', 'Check-Out Time', 'Status'];
    const csvRows = filteredRows.map((row) => [
      row.employeeName,
      row.employeeId,
      row.department,
      row.date,
      formatTime(row.checkInTime),
      formatTime(row.checkOutTime),
      row.status
    ]);
    const csv = [header, ...csvRows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Attendance management</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Daily attendance records</h2>
          <p className="mt-2 text-slate-500">Search, filter, and export the attendance table for any workday.</p>
        </div>
        <Button variant="secondary" leftIcon={<Download className="h-4 w-4" />} onClick={downloadCsv} disabled={!filteredRows.length}>Export CSV</Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-slate-500">Employees for date</p>
            <p className="mt-2 text-3xl font-extrabold text-slate-950">{rows.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-slate-500">Present</p>
            <p className="mt-2 text-3xl font-extrabold text-emerald-600">{presentCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm font-semibold text-slate-500">Absent</p>
            <p className="mt-2 text-3xl font-extrabold text-red-600">{absentCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1.2fr]">
            <Input label="Date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            <Select
              label="Employee"
              value={employeeFilter}
              onChange={(event) => setEmployeeFilter(event.target.value)}
            >
              <option value="all">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>{employee.full_name} ({employee.employee_id})</option>
              ))}
            </Select>
            <Select
              label="Status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | AttendanceStatus)}
              options={[
                { label: 'All statuses', value: 'all' },
                { label: 'Present', value: 'present' },
                { label: 'Absent', value: 'absent' }
              ]}
            />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate-400" aria-hidden="true" />
              <Input label="Search" className="pl-9" placeholder="Name, ID, department..." value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : filteredRows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="pb-3 font-bold">Employee name</th>
                    <th className="pb-3 font-bold">Employee ID</th>
                    <th className="pb-3 font-bold">Date</th>
                    <th className="pb-3 font-bold">Check-in time</th>
                    <th className="pb-3 font-bold">Check-out time</th>
                    <th className="pb-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td className="py-4">
                        <p className="font-bold text-slate-950">{row.employeeName}</p>
                        <p className="text-xs text-slate-500">{row.department}</p>
                      </td>
                      <td className="py-4 text-slate-600">{row.employeeId}</td>
                      <td className="py-4 text-slate-600">{formatDate(row.date)}</td>
                      <td className="py-4 text-slate-600">{formatTime(row.checkInTime)}</td>
                      <td className="py-4 text-slate-600">{formatTime(row.checkOutTime)}</td>
                      <td className="py-4"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              icon={<CalendarSearch className="h-6 w-6" />}
              title="No attendance records match your filters"
              description="Change the date, employee, status, or search query to see attendance rows."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
