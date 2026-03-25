import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle, CheckCircle, XCircle, Bell, TrendingUp, Shield } from 'lucide-react';
import { toast } from 'sonner';
import io from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [realtimeAlerts, setRealtimeAlerts] = useState([]);

  useEffect(() => {
    fetchStats();
    
    // Setup Socket.IO for real-time alerts
    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to real-time alerts');
    });

    socket.on('security-alert', (alert) => {
      console.log('Security alert received:', alert);
      
      // Show toast notification
      toast.error(
        `Security Alert: ${alert.email} - Risk Score: ${alert.riskScore}`,
        { duration: 5000 }
      );
      
      // Add to realtime alerts list
      setRealtimeAlerts(prev => [alert, ...prev].slice(0, 5));
      
      // Refresh stats
      fetchStats();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/activity/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch statistics');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading dashboard...</div>
      </div>
    );
  }

  const COLORS = ['#10B981', '#F59E0B', '#EF4444'];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-md text-sm">
          {payload.map((entry, index) => (
            <div key={index}>
              {entry.name}: {entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-8 md:p-12">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900" data-testid="dashboard-title">
          Dashboard
        </h1>
        <p className="text-slate-500 mt-2">Security monitoring overview and analytics</p>
      </div>

      {/* Real-time Alerts Banner */}
      {realtimeAlerts.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" data-testid="realtime-alerts">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="text-red-600" size={20} />
            <h3 className="font-medium text-red-900">Recent Security Alerts</h3>
          </div>
          <div className="space-y-2">
            {realtimeAlerts.map((alert, idx) => (
              <div key={idx} className="text-sm text-red-700 flex justify-between items-center">
                <span>{alert.email} - {alert.reason}</span>
                <span className="font-mono font-semibold">Risk: {alert.riskScore}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Cards - Now 6 cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-lg p-6" data-testid="total-logins-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Total Logins</p>
              <p className="text-3xl font-semibold text-slate-900">{stats?.totalLogins || 0}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-md flex items-center justify-center">
              <CheckCircle className="text-emerald-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6" data-testid="failed-attempts-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Failed Attempts</p>
              <p className="text-3xl font-semibold text-slate-900">{stats?.failedAttempts || 0}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-md flex items-center justify-center">
              <XCircle className="text-red-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6" data-testid="high-risk-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">High Risk Logins</p>
              <p className="text-3xl font-semibold text-slate-900">{stats?.highRiskLogins || 0}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-md flex items-center justify-center">
              <AlertCircle className="text-amber-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6" data-testid="alerts-triggered-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Alerts Triggered</p>
              <p className="text-3xl font-semibold text-slate-900">{stats?.alertsTriggered || 0}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 rounded-md flex items-center justify-center">
              <Bell className="text-red-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6" data-testid="suspicious-activity-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">Suspicious Activity</p>
              <p className="text-3xl font-semibold text-slate-900">{stats?.suspiciousActivityCount || 0}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-md flex items-center justify-center">
              <TrendingUp className="text-amber-600" size={20} />
            </div>
          </div>
        </div>

        <div className="bg-white border border-red-100 rounded-lg p-6" data-testid="ml-blocked-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-500 mb-1">ML Blocked</p>
              <p className="text-3xl font-semibold text-red-600">{stats?.mlBlockedCount || 0}</p>
              <p className="text-xs text-slate-400 mt-1">Auto-blocked by ML</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-md flex items-center justify-center">
              <Shield className="text-red-700" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Active Blocks Info */}
      {stats?.activeBlocks && (stats.activeBlocks.users > 0 || stats.activeBlocks.ips > 0 || stats.activeBlocks.devices > 0) && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4" data-testid="active-blocks">
          <h3 className="font-medium text-red-900 mb-2 flex items-center gap-2">
            <Shield size={18} />
            Active Blocks (10-min duration)
          </h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-red-600 font-semibold">{stats.activeBlocks.users}</span>
              <span className="text-slate-600"> User Accounts</span>
            </div>
            <div>
              <span className="text-red-600 font-semibold">{stats.activeBlocks.ips}</span>
              <span className="text-slate-600"> IP Addresses</span>
            </div>
            <div>
              <span className="text-red-600 font-semibold">{stats.activeBlocks.devices}</span>
              <span className="text-slate-600"> Devices</span>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Line Chart */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="activity-chart">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-medium text-slate-900">Login Activity (Last 7 Days)</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.dailyActivity || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="_id" stroke="#64748B" style={{ fontSize: '12px' }} />
                <YAxis stroke="#64748B" style={{ fontSize: '12px' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '14px' }} />
                <Line type="monotone" dataKey="success" stroke="#10B981" strokeWidth={2} name="Success" />
                <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} name="Failed" />
                <Line type="monotone" dataKey="highRisk" stroke="#F59E0B" strokeWidth={2} name="High Risk" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="risk-distribution-chart">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-medium text-slate-900">Risk Distribution</h3>
          </div>
          <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats?.riskDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(stats?.riskDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent High-Risk Activities */}
      {stats?.recentHighRisk && stats.recentHighRisk.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="recent-high-risk">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-lg font-medium text-slate-900">Recent High-Risk Activities</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {stats.recentHighRisk.map((activity, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 bg-red-50 border border-red-100 rounded-md">
                  <div>
                    <p className="font-medium text-slate-900">{activity.email}</p>
                    <p className="text-sm text-slate-500">{activity.reason}</p>
                    {activity.mlAnomalyScore > 0 && (
                      <p className="text-xs text-purple-600 mt-1">ML Score: {activity.mlAnomalyScore}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono font-semibold text-red-600">Risk: {activity.riskScore}</p>
                    {activity.wasBlocked && (
                      <p className="text-xs text-red-700 font-semibold mt-1">🚫 BLOCKED</p>
                    )}
                    <p className="text-xs text-slate-500">{new Date(activity.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
