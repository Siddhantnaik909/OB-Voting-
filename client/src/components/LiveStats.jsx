import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, Users, Activity } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function LiveStats({ socket }) {
  const [stats, setStats] = useState({
    total: 0,
    yes: { count: 0, percentage: 0 },
    no: { count: 0, percentage: 0 },
    last_updated: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    fetchStats()
    
    // Setup polling as fallback
    const pollInterval = setInterval(fetchStats, 5000)
    
    // Socket.io real-time updates
    if (socket) {
      socket.on('vote_update', (data) => {
        setStats(prev => ({
          ...prev,
          total: data.total,
          yes: { 
            count: data.stats.YES || 0, 
            percentage: data.total > 0 ? ((data.stats.YES || 0) / data.total * 100).toFixed(1) : 0 
          },
          no: { 
            count: data.stats.NO || 0, 
            percentage: data.total > 0 ? ((data.stats.NO || 0) / data.total * 100).toFixed(1) : 0 
          },
          last_updated: new Date().toISOString()
        }))
        setIsLive(true)
        setTimeout(() => setIsLive(false), 1000)
      })

      socket.on('votes_reset', () => {
        fetchStats()
      })
    }

    return () => {
      clearInterval(pollInterval)
      if (socket) {
        socket.off('vote_update')
        socket.off('votes_reset')
      }
    }
  }, [socket])

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats`)
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
      setError(null)
    } catch (err) {
      setError('Unable to fetch live statistics')
      console.error('Stats error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className={`card ${isLive ? 'ring-2 ring-primary-500' : ''} transition-all duration-300`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-primary-500" />
          Live Statistics
        </h2>
        <div className="flex items-center space-x-2">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${socket?.connected ? 'bg-green-400' : 'bg-yellow-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${socket?.connected ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {socket?.connected ? 'Live' : 'Polling'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 
                        rounded-lg text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {/* Yes Stats */}
        <div className="stat-card bg-yes-50 dark:bg-yes-900/20 border-2 border-yes-200 dark:border-yes-800">
          <CheckCircle className="w-10 h-10 text-yes-500 mb-2" />
          <div className="text-3xl font-bold text-yes-600 dark:text-yes-400">
            {stats.yes?.count || 0}
          </div>
          <div className="text-sm text-yes-700 dark:text-yes-300 font-medium">
            YES ({stats.yes?.percentage || 0}%)
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Can see the subject
          </div>
        </div>

        {/* No Stats */}
        <div className="stat-card bg-no-50 dark:bg-no-900/20 border-2 border-no-200 dark:border-no-800">
          <XCircle className="w-10 h-10 text-no-500 mb-2" />
          <div className="text-3xl font-bold text-no-600 dark:text-no-400">
            {stats.no?.count || 0}
          </div>
          <div className="text-sm text-no-700 dark:text-no-300 font-medium">
            NO ({stats.no?.percentage || 0}%)
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Cannot see the subject
          </div>
        </div>
      </div>

      {/* Total Participants */}
      <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div className="flex items-center justify-center space-x-2">
          <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="text-gray-600 dark:text-gray-300">
            Total Participants:
          </span>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            {stats.total}
          </span>
        </div>
        {stats.last_updated && (
          <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-2">
            Last updated: {new Date(stats.last_updated).toLocaleTimeString()}
          </div>
        )}
      </div>
    </div>
  )
}

export default LiveStats
