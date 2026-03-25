import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Shield, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const UsersPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error('Failed to fetch users');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User role updated successfully');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user role');
      console.error(error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900" data-testid="users-title">
          User Management
        </h1>
        <p className="text-slate-500 mt-2">Manage user roles and permissions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="users-grid">
        {users.map((user) => (
          <div
            key={user._id}
            className="bg-white border border-slate-200 rounded-lg overflow-hidden hover:-translate-y-0.5 hover:shadow-md transition-transform"
            data-testid="user-card"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  {user.role === 'ADMIN' ? (
                    <Shield className="text-slate-900" size={20} />
                  ) : (
                    <User className="text-slate-600" size={20} />
                  )}
                </div>
                <span
                  className={`text-xs font-medium uppercase tracking-widest px-2 py-1 rounded ${
                    user.role === 'ADMIN'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {user.role}
                </span>
              </div>

              <h3 className="text-lg font-medium text-slate-900 mb-1">{user.email}</h3>
              <p className="text-sm text-slate-500 mb-4">ID: {user._id}</p>

              <div className="pt-4 border-t border-slate-100">
                {user.role === 'USER' ? (
                  <button
                    onClick={() => handleRoleChange(user._id, 'ADMIN')}
                    data-testid={`promote-button-${user._id}`}
                    className="w-full bg-slate-900 text-white hover:bg-slate-800 rounded-md px-4 py-2 text-sm font-medium transition-transform active:scale-95"
                  >
                    Promote to Admin
                  </button>
                ) : (
                  <button
                    onClick={() => handleRoleChange(user._id, 'USER')}
                    data-testid={`demote-button-${user._id}`}
                    className="w-full bg-white border border-slate-200 text-slate-900 hover:bg-slate-50 rounded-md px-4 py-2 text-sm font-medium transition-colors"
                  >
                    Demote to User
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-slate-500">No users found</div>
      )}
    </div>
  );
};

export default UsersPage;
