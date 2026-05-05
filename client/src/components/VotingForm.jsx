import { useState, useEffect } from 'react'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'
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
        if (data.has_voted) {
          setHasVoted(true)
          setPreviousVote(data.vote)
        }
      }
    } catch (err) {
      console.error('Error checking vote status:', err)
    }
  }

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
        setHasVoted(true)
        setPreviousVote(data.existing_vote)
        setError('You have already voted. Each user can only vote once.')
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
          Thank You for Voting!
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          You voted: <span className={`font-semibold ${
            previousVote?.vote_type === 'YES' ? 'text-yes-600' : 'text-no-600'
          }`}>
            {previousVote?.vote_type === 'YES' ? 'YES' : 'NO'}
          </span>
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Voted on: {new Date(previousVote?.timestamp).toLocaleString()}
        </p>
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Your vote has been recorded. You can see live results below.
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
        <p className="text-lg text-gray-700 dark:text-gray-300">
          Are you able to see your <span className="font-semibold text-primary-600">'Organizational Behavior'</span> exam subject?
        </p>
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
    </div>
  )
}

export default VotingForm
