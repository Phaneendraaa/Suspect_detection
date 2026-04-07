import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Shield, User } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const UsersPage = () => {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ FIXED: useCallback
  const fetchUsers = useCallback(async () => {
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
  }, [token]);

  // ✅ FIXED: dependency added
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(
        `${BACKEND_URL}/api/users/${userId}/role`,
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('User role updated successfully');

      fetchUsers(); // safe now
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
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="text-slate-500 mt-2">
          Manage user roles and permissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map((user) => (
          <div
            key={user._id}
            className="bg-white border border-slate-200 rounded-lg hover:shadow-md transition"
          >
            <div className="p-6">
              <div className="flex justify-between mb-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center">
                  {user.role === 'ADMIN' ? (
                    <Shield size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>

                <span className="text-xs px-2 py-1 rounded bg-slate-100">
                  {user.role}
                </span>
              </div>

              <h3 className="font-medium">{user.email}</h3>
              <p className="text-sm text-gray-500">{user._id}</p>

              <div className="mt-4">
                {user.role === 'USER' ? (
                  <button
                    onClick={() => handleRoleChange(user._id, 'ADMIN')}
                    className="w-full bg-black text-white py-2 rounded"
                  >
                    Promote
                  </button>
                ) : (
                  <button
                    onClick={() => handleRoleChange(user._id, 'USER')}
                    className="w-full border py-2 rounded"
                  >
                    Demote
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          No users found
        </div>
      )}
    </div>
  );
};

export default UsersPage;