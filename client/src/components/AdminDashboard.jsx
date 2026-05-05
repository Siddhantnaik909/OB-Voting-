import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { 
  LogOut, 
  Download, 
  RefreshCw, 
  Users, 
  CheckCircle, 
  XCircle,
  AlertTriangle,
  BarChart3,
  PieChart,
  Trash2,
  FileSpreadsheet
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RePieChart, Pie, Cell } from 'recharts'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const COLORS = {
  YES: '#22c55e',
  NO: '#ef4444'
}

function AdminDashboard({ onLogout }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [socket, setSocket] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [dateRange, setDateRange] = useState({ start: '', end: '' })

  useEffect(() => {
    fetchDashboardData()

    // Socket.io connection
    const newSocket = io(API_URL)
    
    newSocket.on('vote_update', () => {
      fetchDashboardData()
    })

    newSocket.on('votes_reset', () => {
      fetchDashboardData()
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.status === 401 || response.status === 403) {
        onLogout()
        return
      }

      if (!response.ok) throw new Error('Failed to fetch dashboard data')

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async (format = 'xlsx') => {
    setExportLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      
      let url = `${API_URL}/api/export/${format}`
      const params = new URLSearchParams()
      if (dateRange.start) params.append('start_date', dateRange.start)
      if (dateRange.end) params.append('end_date', dateRange.end)
      if (params.toString()) url += `?${params.toString()}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Export failed');
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      a.download = `OB_Voting_Report_${timestamp}.${format}`
      
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      alert('Failed to export: ' + err.message)
    } finally {
      setExportLoading(false)
    }
  }

  const handleReset = async () => {
    if (!resetConfirm) {
      setResetConfirm(true)
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/votes/reset`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ confirmation: 'DELETE_ALL_VOTES' })
      })

      if (!response.ok) throw new Error('Reset failed')

      await fetchDashboardData()
      setResetConfirm(false)
      alert('All votes have been reset successfully')
    } catch (err) {
      alert('Failed to reset: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card text-center p-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchDashboardData}
          className="mt-4 btn-primary"
        >
          Retry
        </button>
      </div>
    )
  }

  const chartData = stats ? [
    { name: 'YES', value: stats.yes_count, fill: COLORS.YES },
    { name: 'NO', value: stats.no_count, fill: COLORS.NO }
  ] : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="w-7 h-7 mr-2 text-primary-600" />
            Admin Dashboard
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            {stats?.subject || 'Organizational Behavior'} - Voting Analytics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchDashboardData}
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 
                     hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={onLogout}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 
                     text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <Users className="w-8 h-8 text-primary-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.total_votes || 0}</div>
          <div className="text-sm text-gray-500">Total Votes</div>
        </div>
        
        <div className="stat-card bg-yes-50 dark:bg-yes-900/20">
          <CheckCircle className="w-8 h-8 text-yes-500 mb-2" />
          <div className="text-2xl font-bold text-yes-600 dark:text-yes-400">{stats?.yes_count || 0}</div>
          <div className="text-sm text-yes-700 dark:text-yes-300">Yes Votes ({stats?.yes_percentage || 0}%)</div>
        </div>
        
        <div className="stat-card bg-no-50 dark:bg-no-900/20">
          <XCircle className="w-8 h-8 text-no-500 mb-2" />
          <div className="text-2xl font-bold text-no-600 dark:text-no-400">{stats?.no_count || 0}</div>
          <div className="text-sm text-no-700 dark:text-no-300">No Votes ({stats?.no_percentage || 0}%)</div>
        </div>
        
        <div className="stat-card">
          <Users className="w-8 h-8 text-gray-500 mb-2" />
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.unique_voters || 0}</div>
          <div className="text-sm text-gray-500">Unique Voters</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" />
            Vote Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <PieChart className="w-5 h-5 mr-2" />
            Percentage Breakdown
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center space-x-4 mt-4">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                YES ({stats?.yes_percentage || 0}%)
              </span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded-full bg-red-500 mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                NO ({stats?.no_percentage || 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <FileSpreadsheet className="w-5 h-5 mr-2" />
          Export Reports
        </h3>
        
        {/* Date Filter */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date (Optional)
            </label>
            <input
              type="datetime-local"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleExport('xlsx')}
            disabled={exportLoading}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>{exportLoading ? 'Exporting...' : 'Download Excel (.xlsx)'}</span>
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
            className="btn bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 
                     text-gray-700 dark:text-gray-200 flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="card border-2 border-red-200 dark:border-red-800">
        <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" />
          Danger Zone
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Resetting will permanently delete all voting data. This action cannot be undone.
        </p>
        
        {resetConfirm ? (
          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
            <p className="text-red-700 dark:text-red-300 mb-3">
              Are you sure? Type <code className="bg-red-100 dark:bg-red-800 px-2 py-0.5 rounded">DELETE_ALL_VOTES</code> to confirm.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg 
                         font-medium transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Reset All Votes</span>
              </button>
              <button
                onClick={() => setResetConfirm(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 
                         dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 
                         rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setResetConfirm(true)}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 
                     dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 
                     rounded-lg font-medium transition-colors flex items-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset All Votes</span>
          </button>
        )}
      </div>

      {/* Last Updated */}
      {stats?.last_updated && (
        <p className="text-center text-sm text-gray-400 dark:text-gray-500">
          Last updated: {new Date(stats.last_updated).toLocaleString()}
        </p>
      )}
    </div>
  )
}

export default AdminDashboard
