import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { Search, ArrowUpDown, Monitor } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const LogsPage = () => {
  const { token } = useAuth();
  const [activities, setActivities] = useState([]);
  const [filteredActivities, setFilteredActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });

  useEffect(() => {
    fetchActivities();
  }, []);

  useEffect(() => {
    let filtered = activities.filter((activity) =>
      activity.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.deviceInfo?.browser?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.deviceInfo?.os?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (sortConfig.key === 'timestamp') {
          aVal = new Date(aVal).getTime();
          bVal = new Date(bVal).getTime();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredActivities(filtered);
  }, [searchTerm, activities, sortConfig]);

  const fetchActivities = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/activity`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setActivities(response.data);
      setFilteredActivities(response.data);
    } catch (error) {
      toast.error('Failed to fetch activity logs');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getRiskColor = (score) => {
    if (score <= 30) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score <= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const getStatusColor = (status) => {
    return status === 'success'
      ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
      : 'text-red-600 bg-red-50 border-red-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-500">Loading logs...</div>
      </div>
    );
  }

  return (
    <div className="p-8 md:p-12">
      <div className="mb-8">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900" data-testid="logs-title">
          Activity Logs
        </h1>
        <p className="text-slate-500 mt-2">Monitor all login attempts and security events</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search by email, location, device..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            data-testid="search-input"
            className="w-full bg-white border border-slate-200 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 rounded-md h-10 pl-10 pr-3 text-sm transition-all"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden" data-testid="logs-table">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-medium">
              <tr>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('email')}
                    className="flex items-center gap-1 hover:text-slate-900"
                    data-testid="sort-email"
                  >
                    Email <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('status')}
                    className="flex items-center gap-1 hover:text-slate-900"
                    data-testid="sort-status"
                  >
                    Status <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">Device Info</th>
                <th className="px-4 py-3 text-left">IP Address</th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('timestamp')}
                    className="flex items-center gap-1 hover:text-slate-900"
                    data-testid="sort-timestamp"
                  >
                    Timestamp <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button
                    onClick={() => handleSort('riskScore')}
                    className="flex items-center gap-1 hover:text-slate-900"
                    data-testid="sort-risk"
                  >
                    Risk Score <ArrowUpDown size={14} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left">ML Score</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    No activity logs found
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => (
                  <tr
                    key={activity._id}
                    className="border-t border-slate-100 hover:bg-slate-50/50 transition-colors"
                    data-testid="log-row"
                  >
                    <td className="px-4 py-3 text-sm font-mono">{activity.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium uppercase tracking-widest border ${getStatusColor(
                          activity.status
                        )}`}
                      >
                        {activity.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {activity.deviceInfo ? (
                        <div className="text-xs text-slate-600">
                          <div className="flex items-center gap-1">
                            <Monitor size={12} />
                            <span>{activity.deviceInfo.browser || 'Unknown'}</span>
                          </div>
                          <div className="text-slate-400">
                            {activity.deviceInfo.os || 'Unknown'} • {activity.deviceInfo.device || 'Desktop'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{activity.ipAddress || activity.location}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-600">
                      {new Date(activity.timestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getRiskColor(
                          activity.riskScore
                        )}`}
                      >
                        {activity.riskScore}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {activity.mlAnomalyScore > 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                          {activity.mlAnomalyScore}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {activity.status === 'blocked' || activity.wasBlocked ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                          🚫 BLOCKED
                        </span>
                      ) : activity.alertTriggered ? (
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                          ⚠️ ALERT
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Normal</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-slate-500">
        Showing {filteredActivities.length} of {activities.length} activities
      </div>
    </div>
  );
};

export default LogsPage;
