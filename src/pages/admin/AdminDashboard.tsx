import { useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, Clock3, UserCheck, UserRoundX, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Alert } from '../../components/ui/Alert';
import { formatDate, formatDateTime, formatTime, getErrorMessage, todayISO } from '../../lib/utils';
import { getDashboardSummary, listRecentAttendance } from '../../services/attendance';
import type { Attendance, DashboardSummary } from '../../types';

function StatCard({ title, value, helper, icon: Icon, tone }: { title: string; value: number; helper: string; icon: typeof Users; tone: string }) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-extrabold text-slate-950">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{helper}</p>
        </div>
        <div className={`rounded-2xl p-3 ${tone}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminDashboard() {
  const [summary, setSummary] = useState<DashboardSummary>({
    total_employees: 0,
    today_attendance: 0,
    present_employees: 0,
    absent_employees: 0
  });
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError('');
      try {
        const [nextSummary, recent] = await Promise.all([getDashboardSummary(), listRecentAttendance(8)]);
        setSummary(nextSummary);
        setRecentAttendance(recent);
      } catch (caughtError) {
        setError(getErrorMessage(caughtError, 'Unable to load dashboard.'));
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const attendanceRate = useMemo(() => {
    if (!summary.total_employees) return 0;
    return Math.round((summary.present_employees / summary.total_employees) * 100);
  }, [summary.present_employees, summary.total_employees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Admin dashboard</p>
          <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Company attendance overview</h2>
          <p className="mt-2 text-slate-500">Track today's attendance, active employees, and recent activity.</p>
        </div>
        <Badge tone="blue">{formatDate(todayISO())}</Badge>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total employees" value={summary.total_employees} helper="Active employee profiles" icon={Users} tone="bg-blue-50 text-blue-700" />
        <StatCard title="Today's records" value={summary.today_attendance} helper="Employees checked in" icon={CalendarDays} tone="bg-violet-50 text-violet-700" />
        <StatCard title="Present" value={summary.present_employees} helper="Marked present today" icon={UserCheck} tone="bg-emerald-50 text-emerald-700" />
        <StatCard title="Absent" value={summary.absent_employees} helper="No check-in yet" icon={UserRoundX} tone="bg-red-50 text-red-700" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-950">Today's attendance rate</h3>
                <p className="mt-1 text-sm text-slate-500">Present employees compared with active employees.</p>
              </div>
              <Activity className="h-5 w-5 text-slate-400" aria-hidden="true" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-extrabold tracking-tight text-slate-950">{attendanceRate}%</p>
                <p className="mt-2 text-sm text-slate-500">{summary.present_employees} of {summary.total_employees} active employees are present.</p>
              </div>
              <Clock3 className="h-12 w-12 text-slate-200" aria-hidden="true" />
            </div>
            <div className="mt-6 h-4 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Attendance rate ${attendanceRate} percent`}>
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${attendanceRate}%` }} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-800">
                <p className="font-bold">Present</p>
                <p>{summary.present_employees} employees</p>
              </div>
              <div className="rounded-2xl bg-red-50 p-3 text-red-800">
                <p className="font-bold">Absent</p>
                <p>{summary.absent_employees} employees</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-bold text-slate-950">Recent attendance activity</h3>
            <p className="mt-1 text-sm text-slate-500">Latest check-ins and check-outs across the company.</p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-100" />)}
              </div>
            ) : recentAttendance.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[580px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="pb-3 font-bold">Employee</th>
                      <th className="pb-3 font-bold">Date</th>
                      <th className="pb-3 font-bold">Check in</th>
                      <th className="pb-3 font-bold">Check out</th>
                      <th className="pb-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {recentAttendance.map((record) => (
                      <tr key={record.id}>
                        <td className="py-3">
                          <p className="font-semibold text-slate-900">{record.employees?.full_name || 'Employee'}</p>
                          <p className="text-xs text-slate-500">{record.employees?.employee_id}</p>
                        </td>
                        <td className="py-3 text-slate-600">{formatDate(record.attendance_date)}</td>
                        <td className="py-3 text-slate-600">{formatTime(record.check_in_time)}</td>
                        <td className="py-3 text-slate-600">{formatDateTime(record.check_out_time)}</td>
                        <td className="py-3"><Badge tone="green">Present</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState title="No attendance activity yet" description="Employee check-ins will appear here as soon as attendance is marked." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
