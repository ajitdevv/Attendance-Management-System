import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types';

export function ProtectedRoute({ roles }: { roles?: AppRole[] }) {
  const { loading, profile } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (roles && !roles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/employee'} replace />;
  }

  return <Outlet />;
}
