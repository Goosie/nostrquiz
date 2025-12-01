import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../utils/constants'
import { QuizQuestion, PlayerGameState } from '../types'

// Mock question data for demonstration
const mockQuestion: QuizQuestion = {
  id: 'q1',
  text: 'What is the capital of France?',
  type: 'multiple_choice',
  options: ['London', 'Berlin', 'Paris', 'Madrid'],
  correct_index: 2,
  time_limit_seconds: 20,
  points: 1000
}

const PlayerGamePage: React.FC = () => {
  const navigate = useNavigate()
  const [gameState, setGameState] = useState<PlayerGameState>({
    sessionId: 'demo-session',
    nickname: 'Player',
    questionIndex: 0,
    timeRemaining: 20,
    hasAnswered: false,
    score: 0,
    gameStatus: 'waiting'
  })
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    // Load player data from localStorage
    const playerData = localStorage.getItem('nostrquiz_player')
    if (!playerData) {
      navigate(ROUTES.JOIN)
      return
    }
    
    const player = JSON.parse(playerData)
    setGameState(prev => ({
      ...prev,
      nickname: player.nickname
    }))
    
    // Start demo game after a short delay
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        gameStatus: 'question',
        currentQuestion: mockQuestion
      }))
      startTimer()
    }, 2000)
  }, [navigate])

  const startTimer = () => {
    const timer = setInterval(() => {
      setGameState(prev => {
        if (prev.timeRemaining <= 1) {
          clearInterval(timer)
          if (!prev.hasAnswered) {
            handleTimeUp()
          }
          return { ...prev, timeRemaining: 0 }
        }
        return { ...prev, timeRemaining: prev.timeRemaining - 1 }
      })
    }, 1000)
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (gameState.hasAnswered || gameState.timeRemaining === 0) return
    
    setSelectedAnswer(answerIndex)
    setGameState(prev => ({ ...prev, hasAnswered: true }))
    
    // Show results after a short delay
    setTimeout(() => {
      const isCorrect = answerIndex === mockQuestion.correct_index
      const points = isCorrect ? mockQuestion.points : 0
      
      setGameState(prev => ({
        ...prev,
        score: prev.score + points,
        gameStatus: 'results'
      }))
      setShowResults(true)
    }, 1000)
  }

  const handleTimeUp = () => {
    setGameState(prev => ({
      ...prev,
      hasAnswered: true,
      gameStatus: 'results'
    }))
    setShowResults(true)
  }

  const getAnswerButtonClass = (index: number) => {
    let className = 'answer-button'
    
    if (selectedAnswer === index) {
      className += ' selected'
    }
    
    if (showResults) {
      if (index === mockQuestion.correct_index) {
        className += ' correct'
      } else if (selectedAnswer === index && index !== mockQuestion.correct_index) {
        className += ' wrong'
      }
    }
    
    return className
  }

  if (gameState.gameStatus === 'waiting') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-md w-full">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-bold mb-2">Welcome, {gameState.nickname}!</h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Waiting for the quiz to start...
          </p>
          <div className="mt-6">
            <div className="animate-pulse w-16 h-2 bg-blue-500 rounded mx-auto"></div>
          </div>
        </div>
      </div>
    )
  }

  if (gameState.gameStatus === 'ended') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="card text-center max-w-md w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
          <div className="text-3xl font-bold mb-4" style={{ color: 'var(--color-accent-cyan)' }}>
            Final Score: {gameState.score}
          </div>
          {gameState.rank && (
            <p className="mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              You finished in {gameState.rank} place!
            </p>
          )}
          <Link to={ROUTES.HOME} className="btn btn-primary">
            Play Again
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold">{gameState.nickname}</h1>
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Score: <span style={{ color: 'var(--color-accent-cyan)' }}>{gameState.score}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Question {gameState.questionIndex + 1}
            </div>
            <div className={`text-2xl font-bold ${
              gameState.timeRemaining <= 5 ? 'text-red-500' : 'text-blue-500'
            }`}>
              {gameState.timeRemaining}s
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-1000"
              style={{ 
                width: `${(gameState.timeRemaining / mockQuestion.time_limit_seconds) * 100}%` 
              }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="card mb-6">
          <h2 className="text-2xl font-bold mb-6 text-center">
            {gameState.currentQuestion?.text}
          </h2>
          
          <div className="space-y-3">
            {gameState.currentQuestion?.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={gameState.hasAnswered || gameState.timeRemaining === 0}
                className={getAnswerButtonClass(index)}
              >
                <span className="font-bold text-lg">
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{option}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {showResults && (
          <div className="card text-center">
            {selectedAnswer === mockQuestion.correct_index ? (
              <>
                <div className="text-6xl mb-4">✅</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-correct)' }}>
                  Correct!
                </h3>
                <p className="mb-4">You earned {mockQuestion.points} points!</p>
              </>
            ) : selectedAnswer !== null ? (
              <>
                <div className="text-6xl mb-4">❌</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-wrong)' }}>
                  Incorrect
                </h3>
                <p className="mb-4">
                  The correct answer was: <strong>{mockQuestion.options[mockQuestion.correct_index]}</strong>
                </p>
              </>
            ) : (
              <>
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-warning)' }}>
                  Time's Up!
                </h3>
                <p className="mb-4">
                  The correct answer was: <strong>{mockQuestion.options[mockQuestion.correct_index]}</strong>
                </p>
              </>
            )}
            
            <button 
              onClick={() => {
                setGameState(prev => ({ ...prev, gameStatus: 'ended' }))
              }}
              className="btn btn-primary"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default PlayerGamePage