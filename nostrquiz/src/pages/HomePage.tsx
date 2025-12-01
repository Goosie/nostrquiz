import React from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../utils/constants'

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card text-center max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4">
          <span style={{ color: 'var(--color-primary)' }}>Nostr</span>
          <span style={{ color: 'var(--color-accent-cyan)' }}>Quiz</span>
        </h1>
        
        <p className="text-lg mb-8" style={{ color: 'var(--color-text-secondary)' }}>
          Kahoot-style quiz platform powered by Nostr protocol
        </p>
        
        <div className="flex flex-col gap-4">
          <Link 
            to={ROUTES.HOST} 
            className="btn btn-primary btn-large"
          >
            🎯 Host a Quiz
          </Link>
          
          <Link 
            to={ROUTES.JOIN} 
            className="btn btn-secondary btn-large"
          >
            🎮 Join Game
          </Link>
        </div>
        
        <div className="mt-8 p-4" style={{ 
          background: 'var(--color-surface-light)', 
          borderRadius: 'var(--rounded)' 
        }}>
          <h3 className="text-sm font-semibold mb-2">Features</h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
            <li>✨ Real-time multiplayer quizzes</li>
            <li>🔗 Powered by Nostr protocol</li>
            <li>📱 Mobile-friendly player interface</li>
            <li>🏆 Live leaderboards</li>
            <li>📝 Formstr integration for quiz creation</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default HomePage