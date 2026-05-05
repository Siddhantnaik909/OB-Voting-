import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import VotingForm from '../components/VotingForm'
import LiveStats from '../components/LiveStats'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

function VotingPage() {
  const [socket, setSocket] = useState(null)
  const [connectionStatus, setConnectionStatus] = useState('connecting')

  useEffect(() => {
    // Initialize Socket.io connection
    const newSocket = io(API_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    newSocket.on('connect', () => {
      console.log('Connected to server')
      setConnectionStatus('connected')
    })

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server')
      setConnectionStatus('disconnected')
    })

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnectionStatus('error')
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <VotingForm />
      <LiveStats socket={socket} />
      
      {/* Connection Status Indicator */}
      {connectionStatus === 'error' && (
        <div className="text-center text-sm text-amber-600 dark:text-amber-400">
          Real-time updates unavailable. Using polling fallback.
        </div>
      )}
    </div>
  )
}

export default VotingPage
