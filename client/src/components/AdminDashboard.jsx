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
  FileSpreadsheet,
  Eye,
  EyeOff,
  UserPlus,
  Database,
  Plus,
  Lock,
  Unlock
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
  const [settings, setSettings] = useState({ resultsPublic: false })
  const [seedLoading, setSeedLoading] = useState(false)
  const [isAddingStudent, setIsAddingStudent] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', prn_number: '', seat_number: '', vote_type: 'YES' })
  const [newAdmin, setNewAdmin] = useState({ username: '', password: '' })
  const [adminLoading, setAdminLoading] = useState(false)

  useEffect(() => {
    fetchDashboardData()
    fetchSettings()

    // Socket.io connection with improved configuration
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })
    
    newSocket.on('connect', () => {
      console.log('Admin Socket connected successfully')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Admin Socket connection error:', error)
    })

    newSocket.on('vote_update', (data) => {
      console.log('Received live vote update:', data)
      fetchDashboardData()
    })

    newSocket.on('votes_reset', () => {
      console.log('Votes reset event received')
      fetchDashboardData()
    })

    newSocket.on('settings_updated', (data) => {
      setSettings(data)
    })

    setSocket(newSocket)

    return () => {
      console.log('Closing socket connection')
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

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err)
    }
  }

  const toggleVotingStatus = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ votingOpen: !settings.votingOpen })
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      alert('Failed to update voting status')
    }
  }

  const togglePublicResults = async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/settings`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resultsPublic: !settings.resultsPublic })
      })
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (err) {
      alert('Failed to update settings')
    }
  }

  const handleSeedData = async () => {
    setSeedLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/seed`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ count: 10 })
      })
      if (response.ok) {
        alert('Successfully seeded 10 fake votes')
        fetchDashboardData()
      }
    } catch (err) {
      alert('Failed to seed data')
    } finally {
      setSeedLoading(false)
    }
  }

  const handleAddStudent = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/add-vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newStudent)
      })
      if (response.ok) {
        alert('Student added successfully')
        setIsAddingStudent(false)
        setNewStudent({ name: '', prn_number: '', seat_number: '', vote_type: 'YES' })
        fetchDashboardData()
      }
    } catch (err) {
      alert('Failed to add student')
    }
  }

  const handleAddAdmin = async (e) => {
    e.preventDefault()
    setAdminLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/register`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newAdmin)
      })
      const data = await response.json()
      if (response.ok) {
        alert('Admin added successfully')
        setNewAdmin({ username: '', password: '' })
      } else {
        alert(data.error || 'Failed to add admin')
      }
    } catch (err) {
      alert('Failed to add admin')
    } finally {
      setAdminLoading(false)
    }
  }

  const handleDeleteVote = async (voteId) => {
    if (!window.confirm('Are you sure you want to delete this vote?')) return
    
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/votes/${voteId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        fetchDashboardData()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete vote')
      }
    } catch (err) {
      alert('Failed to delete vote')
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
            onClick={togglePublicResults}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              settings.resultsPublic 
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
            title={settings.resultsPublic ? "Results are Public" : "Results are Private"}
          >
            {settings.resultsPublic ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            <span className="hidden sm:inline">{settings.resultsPublic ? 'Results Public' : 'Make Public'}</span>
          </button>
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
            <span className="hidden sm:inline">Logout</span>
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

      {/* Admin Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <UserPlus className="w-5 h-5 mr-2" />
            Quick Add Student
          </h3>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  required
                  type="text"
                  placeholder="Student Name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  value={newStudent.name}
                  onChange={e => setNewStudent({...newStudent, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PRN</label>
                <input
                  required
                  type="text"
                  placeholder="PRN Number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  value={newStudent.prn_number}
                  onChange={e => setNewStudent({...newStudent, prn_number: e.target.value})}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Seat No.</label>
                <input
                  type="text"
                  placeholder="Seat Number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  value={newStudent.seat_number}
                  onChange={e => setNewStudent({...newStudent, seat_number: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vote</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
                  value={newStudent.vote_type}
                  onChange={e => setNewStudent({...newStudent, vote_type: e.target.value})}
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                </select>
              </div>
            </div>
            <button type="submit" className="w-full btn-primary flex items-center justify-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Student Vote</span>
            </button>
          </form>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Database className="w-5 h-5 mr-2" />
            Data Management
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            Use these controls to manage your dataset for testing or clearing.
          </p>
          <div className="space-y-4">
            <button
              onClick={handleSeedData}
              disabled={seedLoading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              <Database className="w-4 h-4" />
              <span>{seedLoading ? 'Seeding...' : 'Seed 10 Fake Details'}</span>
            </button>
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Voting Controls</p>
              <button
                onClick={toggleVotingStatus}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors mb-3 ${
                  settings.votingOpen 
                    ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {settings.votingOpen ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span>{settings.votingOpen ? 'Close Voting for Students' : 'Open Voting for Students'}</span>
              </button>
              
              <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Public View</p>
              <button
                onClick={togglePublicResults}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  settings.resultsPublic 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                {settings.resultsPublic ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                <span>{settings.resultsPublic ? 'Unpublish Results' : 'Publish Results to Students'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Votes Table */}
      <div className="card overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center px-6 pt-6">
          <Users className="w-5 h-5 mr-2" />
          Recent Votes
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50 border-y border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Student Details</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vote</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP Address</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stats?.recent_votes_list && stats.recent_votes_list.length > 0 ? (
                stats.recent_votes_list.map((vote) => (
                  <tr key={vote.vote_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {vote.student_info?.name || 'Anonymous'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Seat: {vote.student_info?.seat_number || vote.student_info?.student_id || 'N/A'} | PRN: {vote.student_info?.prn_number || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        vote.vote_type === 'YES' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {vote.vote_type === 'YES' ? (
                          <CheckCircle className="w-3 h-3 mr-1" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1" />
                        )}
                        {vote.vote_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(vote.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {vote.ip_address}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDeleteVote(vote.vote_id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete vote"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500 italic">
                    No votes recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Management Section */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <UserPlus className="w-5 h-5 mr-2 text-primary-600" />
          Manage Administrators
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Create additional administrator accounts to help manage the voting system.
        </p>
        <form onSubmit={handleAddAdmin} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              required
              type="text"
              placeholder="New Admin Username"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              value={newAdmin.username}
              onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
            />
          </div>
          <div>
            <input
              required
              type="password"
              placeholder="New Admin Password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              value={newAdmin.password}
              onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
            />
          </div>
          <button 
            type="submit" 
            disabled={adminLoading}
            className="btn-primary flex items-center justify-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>{adminLoading ? 'Creating...' : 'Create Admin Account'}</span>
          </button>
        </form>
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
