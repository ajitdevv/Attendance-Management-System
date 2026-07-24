import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock, LogIn, LogOut, UserRound } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { formatDate, formatTime, getErrorMessage, statusTone, todayISO } from '../../lib/utils';
import { checkInToday, checkOutToday, getMyEmployeeProfile, getTodayAttendance } from '../../services/attendance';
import type { Attendance, Employee } from '../../types';

export function EmployeeDashboard() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'check-in' | 'check-out' | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function loadDashboard() {
    setLoading(true);
    setError('');
    try {
      const profile = await getMyEmployeeProfile();
      setEmployee(profile);
      if (profile) {
        const todayRecord = await getTodayAttendance(profile.id);
        setAttendance(todayRecord);
      }
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to load employee dashboard.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const statusLabel = useMemo(() => {
    if (!attendance) return 'Not checked in';
    if (attendance.check_out_time) return 'Checked out';
    return 'Checked in';
  }, [attendance]);

  const inactive = employee?.status !== 'active';

  async function handleCheckIn() {
    setSubmitting('check-in');
    setError('');
    setSuccess('');
    try {
      const record = await checkInToday();
      setAttendance(record);
      setSuccess('Check-in recorded successfully.');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to check in.'));
    } finally {
      setSubmitting(null);
    }
  }

  async function handleCheckOut() {
    setSubmitting('check-out');
    setError('');
    setSuccess('');
    try {
      const record = await checkOutToday();
      setAttendance(record);
      setSuccess('Check-out recorded successfully.');
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to check out.'));
    } finally {
      setSubmitting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Employee dashboard</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Mark today's attendance</h2>
          <p className="mt-2 text-slate-500">Your check-in and check-out times are captured automatically.</p>
        </div>
        <Badge tone="blue">{formatDate(todayISO())}</Badge>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}
      {success ? <Alert tone="success">{success}</Alert> : null}
      {inactive ? <Alert tone="error">This employee account is inactive. Attendance actions are disabled.</Alert> : null}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <div key={item} className="h-40 animate-pulse rounded-2xl bg-slate-100" />)}
        </div>
      ) : employee ? (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Employee name</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-950">{employee.full_name}</p>
                  <p className="mt-1 text-sm text-slate-500">{employee.department}</p>
                </div>
                <UserRound className="h-8 w-8 text-slate-300" aria-hidden="true" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Employee ID</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-950">{employee.employee_id}</p>
                  <p className="mt-1 text-sm text-slate-500">Company credential username</p>
                </div>
                <Badge tone={statusTone(employee.status)}>{employee.status}</Badge>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Today's status</p>
                  <p className="mt-2 text-2xl font-extrabold text-slate-950">{statusLabel}</p>
                  <p className="mt-1 text-sm text-slate-500">{attendance ? 'Attendance record exists' : 'No attendance record yet'}</p>
                </div>
                <CalendarClock className="h-8 w-8 text-slate-300" aria-hidden="true" />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <h3 className="text-lg font-bold text-slate-950">Attendance actions</h3>
              <p className="mt-1 text-sm text-slate-500">Manual time editing is not available. The system stores the current time.</p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <LogIn className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">Check-in</p>
                      <p className="text-sm text-slate-500">{attendance ? formatTime(attendance.check_in_time) : 'Not recorded yet'}</p>
                    </div>
                  </div>
                  <Button className="mt-5 w-full" leftIcon={<CheckCircle2 className="h-4 w-4" />} onClick={handleCheckIn} loading={submitting === 'check-in'} disabled={inactive || Boolean(attendance)}>
                    {attendance ? 'Already checked in' : 'Check in now'}
                  </Button>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                      <LogOut className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-950">Check-out</p>
                      <p className="text-sm text-slate-500">{attendance?.check_out_time ? formatTime(attendance.check_out_time) : 'Not recorded yet'}</p>
                    </div>
                  </div>
                  <Button
                    className="mt-5 w-full"
                    variant="secondary"
                    leftIcon={<Clock className="h-4 w-4" />}
                    onClick={handleCheckOut}
                    loading={submitting === 'check-out'}
                    disabled={inactive || !attendance || Boolean(attendance.check_out_time)}
                  >
                    {attendance?.check_out_time ? 'Already checked out' : 'Check out now'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <EmptyState title="No employee profile found" description="Ask an admin to create and activate your employee profile." />
      )}
    </div>
  );
}
