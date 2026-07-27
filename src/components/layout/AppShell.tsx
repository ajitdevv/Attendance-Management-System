import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { BarChart3, CalendarCheck2, Home, LogOut, Menu, Shield, UserRoundCog, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
};

const adminNav: NavItem[] = [
  { label: 'Dashboard', to: '/admin', icon: Home },
  { label: 'Employees', to: '/admin/employees', icon: UserRoundCog },
  { label: 'Attendance', to: '/admin/attendance', icon: CalendarCheck2 }
];

const employeeNav: NavItem[] = [
  { label: 'Dashboard', to: '/employee', icon: Home },
  { label: 'My Attendance', to: '/employee/history', icon: BarChart3 }
];

function Navigation({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/employee'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                isActive ? 'bg-red-400 text-red-950 shadow-sm' : 'text-slate-600 hover:bg-red-100 hover:text-red-950'
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navItems = profile?.role === 'admin' ? adminNav : employeeNav;

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <div className="min-h-screen bg-red-50/50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-red-100 bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-400 text-red-950">
            <Shield className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">AMS</p>
            <h1 className="text-lg font-bold text-slate-950">Attendance</h1>
          </div>
        </div>
        <Navigation items={navItems} />
        <div className="absolute bottom-5 left-4 right-4 rounded-2xl border border-red-100 bg-red-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Signed in as</p>
          <p className="mt-1 truncate text-sm font-bold text-slate-950">{profile?.username}</p>
          <p className="capitalize text-sm text-slate-500">{profile?.role}</p>
          <Button className="mt-4 w-full" variant="secondary" leftIcon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />
          <aside className="relative h-full w-80 max-w-[86vw] bg-white p-5 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-400 text-red-950">
                  <Shield className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-400">AMS</p>
                  <h1 className="text-lg font-bold text-slate-950">Attendance</h1>
                </div>
              </div>
              <Button variant="ghost" size="sm" aria-label="Close menu" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Navigation items={navItems} onNavigate={() => setSidebarOpen(false)} />
            <Button className="mt-8 w-full" variant="secondary" leftIcon={<LogOut className="h-4 w-4" />} onClick={handleSignOut}>
              Sign out
            </Button>
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-red-100 bg-white/90 px-4 backdrop-blur lg:px-8">
          <Button variant="ghost" size="sm" className="lg:hidden" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-sm font-medium text-slate-500">Secure company workspace</p>
            <p className="text-base font-bold text-slate-950 capitalize">{profile?.role} panel</p>
          </div>
          <div className="hidden rounded-full bg-red-100 px-4 py-2 text-sm font-semibold text-red-800 sm:block">
            {profile?.username}
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
