import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useGameSession } from '../hooks/useGameSession';
import { formstrService } from '../services/formstr';
import { Quiz } from '../types';

const HostPage: React.FC = () => {
  const { connected, publicKey, connecting, error, connect, hasExtension } = useNostr();
  const { session, players, gameState, createSession, startGame } = useGameSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);

  // Load quizzes when connected
  useEffect(() => {
    if (connected && publicKey) {
      loadQuizzes();
    }
  }, [connected, publicKey]);

  const loadQuizzes = async () => {
    if (!publicKey) return;
    
    setLoadingQuizzes(true);
    try {
      // Try to fetch real quizzes from Formstr
      const formstrQuizzes = await formstrService.fetchQuizzesForPubkey(publicKey);
      
      // Always include demo quizzes for testing
      const demoQuizzes = formstrService.createDemoQuizzes();
      
      const allQuizzes = [...demoQuizzes, ...formstrQuizzes];
      setQuizzes(allQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
      // Fallback to demo quizzes only
      setQuizzes(formstrService.createDemoQuizzes());
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleStartSession = async () => {
    if (!selectedQuiz || !publicKey) return;
    
    try {
      await createSession(selectedQuiz.id, publicKey);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleStartGame = () => {
    startGame();
  };

  // Not connected state
  if (!connected) {
    return (
      <div className="container">
        <div className="quiz-card">
          <div className="card-header">
            <h1>🎯 Host a Quiz</h1>
            <p>Connect your Nostr extension to start hosting quizzes</p>
          </div>
          
          <div className="card-content">
            <div className="connection-status">
              <div className="status-indicator offline">
                <span className="status-dot"></span>
                {connecting ? 'Connecting...' : 'Not Connected'}
              </div>
            </div>
            
            {error && (
              <div className="error-message">
                <p>{error}</p>
              </div>
            )}
            
            {!hasExtension && (
              <div className="warning-message">
                <p>⚠️ No Nostr extension detected. Please install one first.</p>
              </div>
            )}
            
            <button 
              className="btn btn-primary btn-large"
              onClick={connect}
              disabled={connecting || !hasExtension}
            >
              {connecting ? 'Connecting...' : 'Connect Nostr Extension'}
            </button>
            
            <div className="help-text">
              <h3>Need a Nostr Extension?</h3>
              <p>Install one of these browser extensions:</p>
              <ul>
                <li><strong>Alby</strong> - Popular and user-friendly</li>
                <li><strong>nos2x</strong> - Lightweight option</li>
                <li><strong>Flamingo</strong> - Feature-rich</li>
              </ul>
            </div>
          </div>
          
          <div className="card-footer">
            <Link to="/" className="link-back">← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Game lobby state
  if (session && gameState === 'lobby') {
    return (
      <div className="container">
        <div className="lobby-card">
          <div className="card-header">
            <h1>🎮 Game Lobby</h1>
            <p>Players can join using this PIN</p>
          </div>
          
          <div className="card-content">
            <div className="pin-display">{session.pin}</div>
            
            <div className="qr-placeholder">
              <div className="qr-code">
                <span>📱</span>
                <p>QR Code</p>
                <small>Join at: {window.location.origin}/join?pin={session.pin}</small>
              </div>
            </div>
            
            <div className="players-section">
              <h3>Players Joined ({players.length})</h3>
              <div className="players-list">
                {players.length === 0 ? (
                  <p className="empty-state">Waiting for players to join...</p>
                ) : (
                  players.map(player => (
                    <div key={player.pubkey} className="player-item">
                      <span className="player-name">{player.nickname}</span>
                      <span className={`player-status ${player.connected ? 'online' : 'offline'}`}>
                        {player.connected ? '🟢' : '🔴'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="host-controls">
              <button 
                className="btn btn-success btn-large"
                onClick={handleStartGame}
                disabled={players.length === 0}
              >
                Start Quiz
              </button>
              <button className="btn btn-secondary">
                End Session
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Quiz selection state
  return (
    <div className="container">
      <div className="quiz-card">
        <div className="card-header">
          <h1>📝 Select a Quiz</h1>
          <p>Choose a quiz from your collection</p>
        </div>
        
        <div className="card-content">
          <div className="connection-status">
            <div className="status-indicator online">
              <span className="status-dot"></span>
              Connected to Nostr
            </div>
          </div>
          
          <div className="quiz-selection">
            <div className="quiz-header">
              <h3>Available Quizzes</h3>
              {loadingQuizzes && <span className="loading-spinner">⏳</span>}
            </div>
            
            <div className="quiz-list">
              {quizzes.map(quiz => (
                <div 
                  key={quiz.id}
                  className={`quiz-item ${selectedQuiz?.id === quiz.id ? 'selected' : ''}`}
                  onClick={() => setSelectedQuiz(quiz)}
                >
                  <div className="quiz-info">
                    <h4>{quiz.title}</h4>
                    <p>{quiz.questions.length} questions</p>
                    {quiz.description && <small>{quiz.description}</small>}
                    {quiz.id.startsWith('demo_') && <span className="demo-badge">DEMO</span>}
                  </div>
                  <div className="quiz-actions">
                    {selectedQuiz?.id === quiz.id && <span className="selected-indicator">✓</span>}
                  </div>
                </div>
              ))}
              
              {quizzes.length === 0 && !loadingQuizzes && (
                <div className="empty-state">
                  <p>No quizzes found. Create some quizzes in Formstr or use the demo quizzes.</p>
                </div>
              )}
            </div>
          </div>
          
          <button 
            className="btn btn-primary btn-large"
            onClick={handleStartSession}
            disabled={!selectedQuiz}
          >
            Create Game Session
          </button>
        </div>
        
        <div className="card-footer">
          <Link to="/" className="link-back">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default HostPage;