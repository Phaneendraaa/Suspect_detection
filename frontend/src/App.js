import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'sonner';
import PrivateRoute from './components/PrivateRoute';
import AdminLayout from './components/AdminLayout';
import LoginPage from './pages/LoginPage';
import UserHome from './pages/UserHome';
import AdminDashboard from './pages/AdminDashboard';
import LogsPage from './pages/LogsPage';
import UsersPage from './pages/UsersPage';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* User Routes */}
          <Route
            path="/home"
            element={
              <PrivateRoute allowedRoles={['USER']}>
                <UserHome />
              </PrivateRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <AdminLayout />
              </PrivateRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="logs" element={<LogsPage />} />
            <Route path="users" element={<UsersPage />} />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
