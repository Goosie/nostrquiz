import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
import { useGameSession } from '../hooks/useGameSession';
import { FormstrService } from '../services/formstr';
import { Quiz } from '../types';

export function HostPageFull() {
  const nostr = useNostr();
  const gameSession = useGameSession();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [loadingQuizzes, setLoadingQuizzes] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<'setup' | 'lobby' | 'game' | 'results'>('setup');

  // Load available quizzes
  useEffect(() => {
    if (nostr.connected && nostr.publicKey) {
      loadQuizzes();
    }
  }, [nostr.connected, nostr.publicKey]);

  const loadQuizzes = async () => {
    if (!nostr.publicKey) return;
    
    setLoadingQuizzes(true);
    try {
      const formstrService = new FormstrService();
      const fetchedQuizzes = await formstrService.fetchQuizzesForPubkey(nostr.publicKey);
      setQuizzes(fetchedQuizzes);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const handleCreateSession = async () => {
    if (!selectedQuiz || !nostr.publicKey) return;

    try {
      const sessionId = await gameSession.createSession(selectedQuiz.id, nostr.publicKey);
      setCurrentPhase('lobby');
      console.log('Session created:', sessionId);
    } catch (error) {
      console.error('Error creating session:', error);
    }
  };

  const handleStartGame = () => {
    gameSession.startGame();
    setCurrentPhase('game');
  };

  const handleNextQuestion = () => {
    gameSession.nextQuestion();
  };

  const handleShowResults = () => {
    gameSession.showResults();
    setCurrentPhase('results');
  };

  const handleEndGame = () => {
    gameSession.endGame();
    setCurrentPhase('setup');
    setSelectedQuiz(null);
  };

  // Render setup phase
  if (currentPhase === 'setup') {
    return (
      <div className="host-page">
        <div className="container">
          <h1>Host a Quiz Game</h1>
          
          {/* Nostr Connection Status */}
          <div className="connection-status">
            <h2>Connection Status</h2>
            <div className={`status-indicator ${nostr.connected ? 'connected' : 'disconnected'}`}>
              {nostr.connected ? '🟢 Connected to Nostr' : '🔴 Not Connected'}
            </div>
            
            {!nostr.connected && (
              <div className="connection-actions">
                {nostr.connecting ? (
                  <div className="loading">Connecting...</div>
                ) : (
                  <button onClick={nostr.connect} className="btn btn-primary">
                    Connect to Nostr
                  </button>
                )}
                {nostr.error && (
                  <div className="error-message">{nostr.error}</div>
                )}
              </div>
            )}

            {nostr.connected && nostr.publicKey && (
              <div className="pubkey-info">
                <strong>Public Key:</strong> {nostr.publicKey.substring(0, 16)}...
              </div>
            )}
          </div>

          {/* Quiz Selection */}
          {nostr.connected && (
            <div className="quiz-selection">
              <h2>Select a Quiz</h2>
              
              {loadingQuizzes ? (
                <div className="loading">Loading your quizzes...</div>
              ) : quizzes.length === 0 ? (
                <div className="no-quizzes">
                  <p>No quizzes found for your account.</p>
                  <p>Create quizzes at <a href="https://formstr.app" target="_blank" rel="noopener noreferrer">formstr.app</a></p>
                  <button onClick={loadQuizzes} className="btn btn-secondary">
                    Refresh
                  </button>
                </div>
              ) : (
                <div className="quiz-list">
                  {quizzes.map((quiz) => (
                    <div
                      key={quiz.id}
                      className={`quiz-card ${selectedQuiz?.id === quiz.id ? 'selected' : ''}`}
                      onClick={() => setSelectedQuiz(quiz)}
                    >
                      <h3>{quiz.title}</h3>
                      <p>{quiz.description}</p>
                      <div className="quiz-meta">
                        <span>{quiz.questions.length} questions</span>
                        <span>Language: {quiz.language}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedQuiz && (
                <div className="selected-quiz-actions">
                  <h3>Selected: {selectedQuiz.title}</h3>
                  <button
                    onClick={handleCreateSession}
                    disabled={gameSession.loading}
                    className="btn btn-primary btn-large"
                  >
                    {gameSession.loading ? 'Creating Session...' : 'Create Game Session'}
                  </button>
                  {gameSession.error && (
                    <div className="error-message">{gameSession.error}</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="back-link">
            <Link to="/">← Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  // Render lobby phase
  if (currentPhase === 'lobby') {
    return (
      <div className="host-page lobby-phase">
        <div className="container">
          <h1>Game Lobby</h1>
          
          {gameSession.session && (
            <div className="lobby-info">
              <div className="pin-display">
                <h2>Game PIN</h2>
                <div className="pin-number">{gameSession.session.pin}</div>
                <p>Players can join at: <strong>{window.location.origin}/join</strong></p>
              </div>

              <div className="quiz-info">
                <h3>{selectedQuiz?.title}</h3>
                <p>{selectedQuiz?.questions.length} questions</p>
              </div>

              <div className="players-section">
                <h3>Players ({gameSession.players.length})</h3>
                {gameSession.players.length === 0 ? (
                  <p>Waiting for players to join...</p>
                ) : (
                  <div className="players-list">
                    {gameSession.players.map((player) => (
                      <div key={player.pubkey} className="player-card">
                        <span className="player-nickname">{player.nickname}</span>
                        <span className="player-status">Ready</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lobby-actions">
                <button
                  onClick={handleStartGame}
                  disabled={gameSession.players.length === 0}
                  className="btn btn-primary btn-large"
                >
                  Start Game
                </button>
                <button
                  onClick={() => setCurrentPhase('setup')}
                  className="btn btn-secondary"
                >
                  Cancel Game
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render game phase
  if (currentPhase === 'game') {
    const currentQuestion = selectedQuiz?.questions[gameSession.currentQuestionIndex];
    
    return (
      <div className="host-page game-phase">
        <div className="container">
          <h1>Game in Progress</h1>
          
          {currentQuestion && (
            <div className="current-question">
              <div className="question-header">
                <h2>Question {gameSession.currentQuestionIndex + 1} of {selectedQuiz?.questions.length}</h2>
              </div>
              
              <div className="question-content">
                <h3>{currentQuestion.text}</h3>
                <div className="answer-options">
                  {currentQuestion.options.map((option, index) => (
                    <div
                      key={index}
                      className={`answer-option ${index === currentQuestion.correct_index ? 'correct' : ''}`}
                    >
                      {String.fromCharCode(65 + index)}. {option}
                    </div>
                  ))}
                </div>
              </div>

              <div className="game-stats">
                <div className="stat">
                  <span className="stat-label">Players Answered:</span>
                  <span className="stat-value">
                    {gameSession.answers.filter(a => a.question_index === gameSession.currentQuestionIndex).length} / {gameSession.players.length}
                  </span>
                </div>
              </div>

              <div className="game-controls">
                <button onClick={handleShowResults} className="btn btn-primary">
                  Show Results
                </button>
                {gameSession.currentQuestionIndex < (selectedQuiz?.questions.length || 0) - 1 ? (
                  <button onClick={handleNextQuestion} className="btn btn-secondary">
                    Next Question
                  </button>
                ) : (
                  <button onClick={handleEndGame} className="btn btn-secondary">
                    End Game
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render results phase
  if (currentPhase === 'results') {
    return (
      <div className="host-page results-phase">
        <div className="container">
          <h1>Question Results</h1>
          
          <div className="leaderboard">
            <h2>Leaderboard</h2>
            <div className="leaderboard-list">
              {gameSession.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div key={player.pubkey} className="leaderboard-row">
                    <span className="rank">#{index + 1}</span>
                    <span className="nickname">{player.nickname}</span>
                    <span className="score">{player.score} pts</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="results-actions">
            {gameSession.currentQuestionIndex < (selectedQuiz?.questions.length || 0) - 1 ? (
              <button onClick={() => setCurrentPhase('game')} className="btn btn-primary">
                Continue Game
              </button>
            ) : (
              <button onClick={handleEndGame} className="btn btn-primary">
                End Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}