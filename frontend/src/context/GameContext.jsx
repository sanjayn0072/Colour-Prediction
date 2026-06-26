/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react'
import { io } from 'socket.io-client'
import { useUser } from './UserContext'

const GameContext = createContext(null)

export const GameProvider = ({ children }) => {
  const { user, setRealBalance, fetchUserHistory } = useUser()
  
  // Dice Game states
  const [diceTimeLeft, setDiceTimeLeft] = useState(30)
  const [diceRoundId, setDiceRoundId] = useState('10892')
  const [dicePhase, setDicePhase] = useState('betting')
  const [diceHistory, setDiceHistory] = useState([])
  const [diceResult, setDiceResult] = useState(null)
  const [diceScrambleTrigger, setDiceScrambleTrigger] = useState(false)
  
  // Colour Prediction concurrent sessions state
  const [colourSessions, setColourSessions] = useState({
    '30s': { timeLeft: 30, gameId: '3001', phase: 'betting', results: [] },
    '1m': { timeLeft: 60, gameId: '1002', phase: 'betting', results: [] },
    '2m': { timeLeft: 120, gameId: '2001', phase: 'betting', results: [] },
    '5m': { timeLeft: 300, gameId: '5001', phase: 'betting', results: [] },
  })

  // Backwards compatibility fallback states for 1m session
  const [colourTimeLeft, setColourTimeLeft] = useState(60)
  const [colourRoundId, setColourRoundId] = useState('1002')
  const [colourPhase, setColourPhase] = useState('betting')
  const [colourHistory, setColourHistory] = useState([])

  const [socket, setSocket] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const API_BASE = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.hostname}:5000`;
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_BACKEND_URL || API_BASE;

    // 1. Initialize socket.io-client pointing to our backend server
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
      auth: { token }
    })

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSocket(socketInstance)

    socketInstance.on('connect', () => {
      console.log('Connected to backend Game Socket server');
      socketInstance.emit('join_dice_lobby');
      socketInstance.emit('join_colour');
    })

    // 2. Listen for the GAME_TICK socket event to sync countdown states
    socketInstance.on('GAME_TICK', (data) => {
      if (data.gameType === 'dice') {
        setDiceTimeLeft(data.timeLeft)
        setDiceRoundId(data.gameId)
        setDicePhase(data.phase)
        if (data.history) {
          setDiceHistory(data.history)
        }
      } else if (data.gameType === 'colour') {
        const sessionKey = data.session || '1m';
        setColourSessions((prev) => ({
          ...prev,
          [sessionKey]: {
            ...prev[sessionKey],
            timeLeft: data.timeLeft,
            gameId: data.gameId,
            phase: data.phase,
            results: data.history || prev[sessionKey].results
          }
        }))

        // Backwards compatibility for single 1m values
        if (sessionKey === '1m') {
          setColourTimeLeft(data.timeLeft)
          setColourRoundId(data.gameId)
          setColourPhase(data.phase)
          if (data.history) {
            setColourHistory(data.history.slice(0, 10))
          }
        }
      }
    })

    // 3. Listen for the GAME_RESULT socket event
    socketInstance.on('GAME_RESULT', (data) => {
      if (data.gameType === 'dice') {
        // Dice game result
        setDiceScrambleTrigger(true)
        setDiceResult(data)
        
        setTimeout(() => {
          setDiceScrambleTrigger(false)
          if (data.history) {
            setDiceHistory(data.history);
          } else {
            setDiceHistory((prev) => [
              { id: parseInt(data.gameId, 10), roll: data.outcomeNumber, won: data.outcomeNumber >= 50 },
              ...prev
            ].slice(0, 10))
          }
        }, 800)

        // Update the user's history and balance by querying the server
        if (user) {
          fetchUserHistory()
        }
      } else if (data.gameType === 'colour') {
        // Colour prediction result
        const sessionKey = data.session || '1m';
        const newResult = { id: data.gameId, colour: data.details.colour, number: data.outcome };

        setColourSessions((prev) => {
          const sess = prev[sessionKey];
          const newResults = data.history || [newResult, ...sess.results].slice(0, 20);
          return {
            ...prev,
            [sessionKey]: {
              ...sess,
              results: newResults
            }
          }
        })

        if (sessionKey === '1m') {
          setColourHistory((prev) => [newResult, ...prev].slice(0, 10))
        }

        // Emit custom window event for the ColourPrediction component to handle win UI animations
        const event = new CustomEvent('colour_game_result', { detail: data });
        window.dispatchEvent(event);

        // Update the user's history and balance by querying the server
        if (user) {
          fetchUserHistory()
        }
      }
    })

    return () => {
      socketInstance.disconnect()
    }
  }, [user, setRealBalance, fetchUserHistory])

  return (
    <GameContext.Provider value={{
      socket,
      diceTimeLeft,
      diceRoundId,
      dicePhase,
      diceHistory,
      diceResult,
      diceScrambleTrigger,
      colourSessions,
      colourTimeLeft,
      colourRoundId,
      colourPhase,
      colourHistory
    }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) throw new Error('useGame must be used within GameProvider')
  return context
}
