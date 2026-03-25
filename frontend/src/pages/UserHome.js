import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const UserHome = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Security Monitoring
          </h1>
          <button
            onClick={logout}
            data-testid="logout-button"
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-md px-4 py-2 font-medium transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white border border-slate-200 rounded-lg shadow-none overflow-hidden">
          <div className="px-8 py-12 text-center">
            <div className="mb-6">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl font-semibold text-slate-900">
                  {user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <h2 className="text-4xl font-semibold tracking-tight text-slate-900 mb-2" data-testid="welcome-message">
              Welcome, {user?.email?.split('@')[0]}
            </h2>
            <p className="text-lg text-slate-500 mb-8">
              You are logged in as a regular user
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-md">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-sm font-medium text-emerald-600">Account Active</span>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white border border-slate-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">Account Information</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Email</span>
              <span className="text-slate-900 font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-slate-100">
              <span className="text-slate-500">Role</span>
              <span className="text-slate-900 font-medium">{user?.role}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-500">Access Level</span>
              <span className="text-slate-900 font-medium">Standard User</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserHome;
