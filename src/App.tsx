import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AttendancePage } from './pages/admin/AttendancePage';
import { EmployeesPage } from './pages/admin/EmployeesPage';
import { EmployeeDashboard } from './pages/employee/EmployeeDashboard';
import { EmployeeHistoryPage } from './pages/employee/EmployeeHistoryPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<AppShell />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/employees" element={<EmployeesPage />} />
          <Route path="/admin/attendance" element={<AttendancePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['employee']} />}>
        <Route element={<AppShell />}>
          <Route path="/employee" element={<EmployeeDashboard />} />
          <Route path="/employee/history" element={<EmployeeHistoryPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
