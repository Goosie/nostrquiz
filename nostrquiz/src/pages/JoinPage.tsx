import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
// import { useGameSession } from '../hooks/useGameSession';
import { isValidPin, isValidNickname } from '../utils/helpers';

const JoinPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [nickname, setNickname] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // const { joinSession } = useGameSession();

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate inputs
    if (!isValidPin(pin)) {
      setError('Please enter a valid 6-digit game PIN');
      return;
    }
    
    if (!isValidNickname(nickname)) {
      setError('Nickname must be 2-20 characters long');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // For Release 2, we'll navigate directly to the player page with parameters
      // The real joining logic will happen in PlayerPageReal
      const playerData = {
        pin,
        nickname,
        joinedAt: Date.now()
      };
      
      localStorage.setItem('nostrquiz_player', JSON.stringify(playerData));
      
      // Navigate to player page with PIN and nickname as URL params
      const playerUrl = `/player/game?pin=${pin}&nickname=${encodeURIComponent(nickname)}`;
      console.log('🔄 Navigating to:', playerUrl);
      navigate(playerUrl);
      
    } catch (error) {
      console.error('Failed to join game:', error);
      setError(error instanceof Error ? error.message : 'Failed to join game. Please check the PIN and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold mb-2">Join Game</h1>
          <p style={{ color: 'var(--color-text-secondary)' }}>
            Enter the game PIN to join a quiz
          </p>
        </div>
        
        <form onSubmit={handleJoinGame} className="space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium mb-2">
              Game PIN
            </label>
            <input
              id="pin"
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full p-4 text-center text-2xl font-bold tracking-widest border-2 rounded-lg"
              style={{
                background: 'var(--color-surface-light)',
                borderColor: 'var(--color-surface-light)',
                color: 'var(--color-text)'
              }}
              maxLength={6}
              required
            />
          </div>
          
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium mb-2">
              Your Nickname
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              className="w-full p-3 border-2 rounded-lg"
              style={{
                background: 'var(--color-surface-light)',
                borderColor: 'var(--color-surface-light)',
                color: 'var(--color-text)'
              }}
              maxLength={20}
              required
            />
          </div>
          
          {error && (
            <div className="p-3 rounded-lg text-center" 
                 style={{ background: 'var(--color-wrong)', color: 'white' }}>
              {error}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isLoading || !pin || !nickname}
            className="btn btn-primary btn-large w-full"
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <Link to="/" className="btn btn-secondary">
            ← Back to Home
          </Link>
        </div>
        
        <div className="mt-6 p-4 rounded-lg" 
             style={{ background: 'var(--color-surface-light)' }}>
          <h3 className="text-sm font-semibold mb-2">How to Join</h3>
          <ul className="text-sm space-y-1" style={{ color: 'var(--color-text-secondary)' }}>
            <li>1. Get the 6-digit PIN from your quiz host</li>
            <li>2. Enter your nickname (2-20 characters)</li>
            <li>3. Click "Join Game" to enter the lobby</li>
            <li>4. Wait for the host to start the quiz</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default JoinPage