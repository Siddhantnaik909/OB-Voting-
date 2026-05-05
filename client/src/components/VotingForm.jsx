import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, AlertCircle, Loader2, Lock, Users, BarChart3, RefreshCw, Clock } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function VotingForm({ onVoteSubmitted }) {
  const [hasVoted, setHasVoted] = useState(false)
  const [previousVote, setPreviousVote] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [sessionToken, setSessionToken] = useState('')
  const [showStudentInfo, setShowStudentInfo] = useState(true)
  const [studentInfo, setStudentInfo] = useState({
    name: '',
    seat_number: '',
    prn_number: ''
  })
  const [votingOpen, setVotingOpen] = useState(true)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [pendingVoteType, setPendingVoteType] = useState(null)
  const [deadline, setDeadline] = useState(null)
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(null)

  useEffect(() => {
    // Get or create session token
    let token = localStorage.getItem('ob_voting_session')
    if (!token) {
      token = uuidv4()
      localStorage.setItem('ob_voting_session', token)
    }
    setSessionToken(token)

    // Check if already voted
    checkExistingVote(token)
  }, [])

  const checkExistingVote = async (token) => {
    try {
      const response = await fetch(
        `${API_URL}/api/votes/check?session_token=${token}`
      )
      if (response.ok) {
        const data = await response.json()
        setVotingOpen(data.votingOpen)
        setDeadline(data.deadline)
        setTimerEnabled(data.timerEnabled)
        
        if (data.has_voted) {
          setHasVoted(true)
          setPreviousVote(data.vote)
        }
      }
    } catch (err) {
      console.error('Error checking vote status:', err)
    }
  }

  useEffect(() => {
    if (!timerEnabled || !deadline) return

    const timer = setInterval(() => {
      const now = new Date().getTime()
      const end = new Date(deadline).getTime()
      const distance = end - now

      if (distance < 0) {
        clearInterval(timer)
        setTimeRemaining('Voting Ended')
        setVotingOpen(false)
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((distance % (1000 * 60)) / 1000)
        setTimeRemaining(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [timerEnabled, deadline])

  const submitVote = async (voteType) => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Validation for required fields
      if (!studentInfo.name || !studentInfo.prn_number || !studentInfo.seat_number) {
        setError('Please enter your Name, PRN Number, and Seat Number to vote.')
        setIsSubmitting(false)
        return
      }

      const payload = {
        vote_type: voteType,
        session_token: sessionToken,
        student_info: studentInfo
      }

      const response = await fetch(`${API_URL}/api/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.status === 409) {
        if (data.allow_update) {
          setPendingVoteType(voteType)
          setShowUpdateModal(true)
          setIsSubmitting(false)
          return
        }
        
        setError(data.error || 'You have already voted.')
        setHasVoted(true)
        setPreviousVote(data.existing_vote || { vote_type: voteType })
        return
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit vote')
      }

      setSuccess(true)
      setHasVoted(true)
      setPreviousVote({
        vote_type: voteType,
        timestamp: new Date().toISOString()
      })

      // Notify parent component
      if (onVoteSubmitted) {
        onVoteSubmitted(data)
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      setError(err.message || 'Failed to submit vote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const submitVoteWithUpdate = async (voteType) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        vote_type: voteType,
        session_token: sessionToken,
        student_info: studentInfo,
        allow_update: true
      }

      const response = await fetch(`${API_URL}/api/votes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update vote')
      }

      setSuccess(true)
      setShowUpdateModal(false)
      setHasVoted(true)
      setPreviousVote({
        vote_type: voteType,
        timestamp: new Date().toISOString()
      })

      if (onVoteSubmitted) {
        onVoteSubmitted(data)
      }

      setTimeout(() => setSuccess(false), 3000)

    } catch (err) {
      setError(err.message || 'Failed to update vote. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!votingOpen) {
    return (
      <div className="card text-center animate-slide-in border-t-4 border-amber-500">
        <div className="mb-6 w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-10 h-10 text-amber-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Voting is Closed
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          The administrator has closed the voting for this subject. If you haven't voted yet and believe this is an error, please contact your department.
        </p>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-500 italic">
            "Only the administrator can make changes at this time."
          </p>
        </div>
      </div>
    )
  }

  if (hasVoted) {
    return (
      <div className="card text-center animate-slide-in">
        <div className="mb-4">
          {previousVote?.vote_type === 'YES' ? (
            <CheckCircle className="w-16 h-16 text-yes-500 mx-auto" />
          ) : (
            <XCircle className="w-16 h-16 text-no-500 mx-auto" />
          )}
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Vote Submitted Successfully!
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Your response for <span className="font-semibold">Organizational Behavior</span> has been recorded.
        </p>
        <div className="inline-flex items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-full mb-6">
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Your Choice:</span>
          <span className={`font-bold ${
            previousVote?.vote_type === 'YES' ? 'text-yes-600' : 'text-no-600'
          }`}>
            {previousVote?.vote_type === 'YES' ? 'YES (I can see it)' : 'NO (I cannot see it)'}
          </span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Voted on: {previousVote?.timestamp ? new Date(previousVote.timestamp).toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }) : new Date().toLocaleString()}
        </p>
        
        <div className="mt-8 space-y-3">
          <button
            onClick={() => {
              setHasVoted(false)
              setStudentInfo({ name: '', seat_number: '', prn_number: '' })
              setError(null)
              setSuccess(false)
            }}
            className="w-full btn-primary py-3 flex items-center justify-center space-x-2"
          >
            <Users className="w-5 h-5" />
            <span>Vote for Another Student</span>
          </button>
          
          <Link
            to="/results"
            className="w-full flex items-center justify-center space-x-2 py-3 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
          >
            <BarChart3 className="w-5 h-5" />
            <span>View Voting Results</span>
          </Link>

          <p className="text-xs text-gray-400">
            One device can be used for multiple students.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="card animate-slide-in">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Organizational Behavior Exam
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
          Are you able to see your <span className="font-semibold text-primary-600">'Organizational Behavior'</span> exam subject?
        </p>

        {timerEnabled && timeRemaining && (
          <div className="mt-6 inline-flex items-center space-x-3 px-6 py-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-900/30 rounded-full animate-pulse">
            <Clock className="w-5 h-5 text-primary-600" />
            <span className="text-lg font-mono font-bold text-primary-700 dark:text-primary-400">
              {timeRemaining}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 
                        rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 
                        rounded-lg text-center">
          <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
          <p className="text-green-700 dark:text-green-300 font-semibold">
            Vote submitted successfully!
          </p>
        </div>
      )}

      {/* Student Info Toggle */}
      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowStudentInfo(!showStudentInfo)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          {showStudentInfo ? '- Hide student information' : '+ Add student information (Required)'}
        </button>

        {showStudentInfo && (
          <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3 animate-slide-in">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name
              </label>
              <input
                type="text"
                value={studentInfo.name}
                onChange={(e) => setStudentInfo({ ...studentInfo, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your name"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Student Current Seat Number
                </label>
                <input
                  type="text"
                  value={studentInfo.seat_number}
                  onChange={(e) => setStudentInfo({ ...studentInfo, seat_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Seat Number"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  PRN Number
                </label>
                <input
                  type="text"
                  value={studentInfo.prn_number}
                  onChange={(e) => setStudentInfo({ ...studentInfo, prn_number: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                           focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="PRN Number"
                  required
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voting Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => submitVote('YES')}
          disabled={isSubmitting}
          className="btn-yes py-6 text-lg flex flex-col items-center space-y-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <CheckCircle className="w-8 h-8" />
          )}
          <span>YES</span>
          <span className="text-sm font-normal opacity-90">
            I can see the subject
          </span>
        </button>

        <button
          onClick={() => submitVote('NO')}
          disabled={isSubmitting}
          className="btn-no py-6 text-lg flex flex-col items-center space-y-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <XCircle className="w-8 h-8" />
          )}
          <span>NO</span>
          <span className="text-sm font-normal opacity-90">
            I cannot see the subject
          </span>
        </button>
      </div>

      <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
        Note: You can only vote once. Your IP address and device information will be recorded 
        to prevent duplicate voting.
      </p>

      {/* Update Confirmation Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <RefreshCw className="w-8 h-8 text-primary-600 animate-spin-slow" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Update your vote?</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                A vote already exists for <span className="font-bold text-gray-900 dark:text-white">PRN: {studentInfo.prn_number}</span>. 
                Do you want to change your answer to <span className="font-bold text-primary-600">{pendingVoteType}</span>?
              </p>
              
              <div className="space-y-3">
                <button
                  onClick={() => submitVoteWithUpdate(pendingVoteType)}
                  className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 shadow-lg shadow-primary-600/20 active:scale-95 transition-all"
                >
                  Yes, Update my vote
                </button>
                <button
                  onClick={() => {
                    setShowUpdateModal(false)
                    setError('Vote not updated. A record already exists for this PRN.')
                  }}
                  className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VotingForm
