import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Activity, Users, LogOut } from 'lucide-react';

const AdminLayout = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/logs', label: 'Activity Logs', icon: Activity },
    { path: '/users', label: 'User Management', icon: Users }
  ];

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 text-white p-6 flex flex-col gap-2 z-50">
        <div className="mb-8">
          <h1 className="text-xl font-semibold tracking-tight">Security Monitor</h1>
          <p className="text-sm text-slate-400 mt-1">Admin Panel</p>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-slate-900 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon size={20} strokeWidth={1.5} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-slate-700">
          <div className="mb-3 px-4">
            <p className="text-xs text-slate-500 mb-1">Logged in as</p>
            <p className="text-sm text-white font-medium truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            data-testid="logout-button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut size={20} strokeWidth={1.5} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
