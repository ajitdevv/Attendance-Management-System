import { useEffect, useMemo, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { formatDate, formatTime, getErrorMessage, statusTone } from '../../lib/utils';
import { getMyEmployeeProfile, listMyAttendanceHistory } from '../../services/attendance';
import type { Attendance, Employee } from '../../types';

const PAGE_SIZE = 8;

export function EmployeeHistoryPage() {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [rows, setRows] = useState<Attendance[]>([]);
  const [count, setCount] = useState(0);
  const [date, setDate] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadHistory(targetPage = page) {
    setLoading(true);
    setError('');
    try {
      const profile = employee || (await getMyEmployeeProfile());
      setEmployee(profile);
      if (!profile) {
        setRows([]);
        setCount(0);
        return;
      }

      const result = await listMyAttendanceHistory(profile.id, {
        date: date || undefined,
        page: targetPage,
        pageSize: PAGE_SIZE
      });
      setRows(result.rows);
      setCount(result.count);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, 'Unable to load attendance history.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory(page);
  }, [page]);

  useEffect(() => {
    setPage(1);
    loadHistory(1);
  }, [date]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / PAGE_SIZE)), [count]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">My attendance</p>
        <h2 className="mt-2 text-3xl font-extrabold text-slate-950">Attendance history</h2>
        <p className="mt-2 text-slate-500">Only your own attendance records are visible in this employee panel.</p>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-950">History records</h3>
            <p className="mt-1 text-sm text-slate-500">{count} records found{employee ? ` for ${employee.full_name}` : ''}.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input label="Filter by date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
            {date ? <Button className="sm:mb-0" type="button" variant="secondary" onClick={() => setDate('')}>Clear</Button> : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : rows.length ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="pb-3 font-bold">Date</th>
                      <th className="pb-3 font-bold">Check-in time</th>
                      <th className="pb-3 font-bold">Check-out time</th>
                      <th className="pb-3 font-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td className="py-4 font-semibold text-slate-950">{formatDate(row.attendance_date)}</td>
                        <td className="py-4 text-slate-600">{formatTime(row.check_in_time)}</td>
                        <td className="py-4 text-slate-600">{formatTime(row.check_out_time)}</td>
                        <td className="py-4"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Previous</Button>
                  <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}>Next</Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              icon={<CalendarRange className="h-6 w-6" />}
              title="No attendance history yet"
              description="Your records will appear here after you check in. Date filters can also hide records."
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
