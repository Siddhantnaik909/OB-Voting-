import { useEffect, useState } from 'react'
import { BarChart3, Users, CheckCircle, XCircle, Clock, Search, AlertCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function ResultsPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/votes/results`)
      const result = await response.json()
      
      if (!response.ok) {
        if (response.status === 403) {
          setData({ isPublic: false, message: result.message })
        } else {
          throw new Error(result.error || 'Failed to fetch results')
        }
      } else {
        setData(result)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const filteredVotes = data?.votes?.filter(vote => 
    vote.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vote.prn.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const stats = data?.votes ? {
    total: data.votes.length,
    yes: data.votes.filter(v => v.vote === 'YES').length,
    no: data.votes.filter(v => v.vote === 'NO').length
  } : null

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-gray-500 animate-pulse">Loading voting results...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-8 card text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <button onClick={fetchResults} className="btn-primary">Try Again</button>
      </div>
    )
  }

  if (data && !data.isPublic) {
    return (
      <div className="max-w-2xl mx-auto mt-12 p-12 card text-center border-t-4 border-primary-500">
        <div className="w-20 h-20 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Clock className="w-10 h-10 text-primary-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Results are Pending</h2>
        <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
          {data.message || "The voting results haven't been published yet. Please check back later once the admin releases them."}
        </p>
        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
          <p className="text-sm text-gray-500">Thank you for your patience.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight">
          Voting Results
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Organizational Behavior Subject - Student Consensus
        </p>
      </div>

      {/* Stats Summary */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="stat-card bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Total Participants</p>
              <h3 className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</h3>
            </div>
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
              <Users className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="stat-card bg-yes-50 dark:bg-yes-900/10 border border-yes-100 dark:border-yes-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yes-700 dark:text-yes-400 uppercase tracking-wider">Approved (YES)</p>
              <h3 className="text-3xl font-bold text-yes-600 dark:text-yes-300 mt-1">{stats.yes}</h3>
            </div>
            <div className="p-3 bg-yes-100 dark:bg-yes-900/40 rounded-xl">
              <CheckCircle className="w-6 h-6 text-yes-600" />
            </div>
          </div>
          <div className="mt-2 w-full bg-yes-200 dark:bg-yes-800 rounded-full h-1.5">
            <div 
              className="bg-yes-500 h-1.5 rounded-full" 
              style={{ width: `${(stats.yes / stats.total * 100) || 0}%` }}
            ></div>
          </div>
        </div>

        <div className="stat-card bg-no-50 dark:bg-no-900/10 border border-no-100 dark:border-no-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-no-700 dark:text-no-400 uppercase tracking-wider">Declined (NO)</p>
              <h3 className="text-3xl font-bold text-no-600 dark:text-no-300 mt-1">{stats.no}</h3>
            </div>
            <div className="p-3 bg-no-100 dark:bg-no-900/40 rounded-xl">
              <XCircle className="w-6 h-6 text-no-600" />
            </div>
          </div>
          <div className="mt-2 w-full bg-no-200 dark:bg-no-800 rounded-full h-1.5">
            <div 
              className="bg-no-500 h-1.5 rounded-full" 
              style={{ width: `${(stats.no / stats.total * 100) || 0}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Voters List */}
      <div className="card shadow-xl overflow-hidden border-none bg-white dark:bg-gray-800">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
            <BarChart3 className="w-6 h-6 mr-3 text-primary-500" />
            Student Voter List
          </h2>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or PRN..."
              className="pl-10 pr-4 py-2 w-full md:w-64 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Student Name</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">PRN Number</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Decision</th>
                <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredVotes.length > 0 ? (
                filteredVotes.map((vote, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors group">
                    <td className="px-8 py-5">
                      <span className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">
                        {vote.name}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <code className="text-sm bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded text-gray-600 dark:text-gray-400 font-mono">
                        {vote.prn}
                      </code>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${
                        vote.vote === 'YES' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {vote.vote === 'YES' ? 'APPROVED' : 'DECLINED'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(vote.time).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Search className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-gray-500 text-lg">No matching records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {data.votes && (
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-sm text-gray-500">
              Showing {filteredVotes.length} of {data.votes.length} total votes
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ResultsPage
