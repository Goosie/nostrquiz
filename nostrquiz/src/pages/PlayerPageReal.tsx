import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useNostrReal } from '../hooks/useNostrReal';
import { ROUTES } from '../utils/constants';

type PlayerPhase = 'joining' | 'lobby' | 'question' | 'waiting' | 'results' | 'finished';

export function PlayerPageReal() {
  console.log('🎮 PlayerPageReal component starting to render...');
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  console.log('🔍 Search params:', searchParams.toString());
  
  const { nostr, gameSession, connect, joinGameSession, submitAnswer } = useNostrReal();
  
  const [phase, setPhase] = useState<PlayerPhase>('joining');
  const [pin, setPin] = useState(searchParams.get('pin') || '');
  const [nickname, setNickname] = useState(searchParams.get('nickname') || '');
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [myScore, setMyScore] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const [lastQuestionScore, setLastQuestionScore] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const hasAttemptedAutoJoinRef = useRef(false);

  // Auto-connect to Nostr when component mounts
  useEffect(() => {
    console.log('🎮 PlayerPageReal mounted with PIN:', pin, 'nickname:', nickname);
    
    if (!nostr.isConnected && !nostr.isConnecting) {
      console.log('🔌 Auto-connecting to Nostr...');
      connect().catch(error => {
        setError('Failed to connect to Nostr');
        console.error('Auto-connect failed:', error);
      });
    }
  }, [nostr.isConnected, nostr.isConnecting, connect]);

  // Auto-join if PIN and nickname are provided via URL params
  useEffect(() => {
    console.log('🔍 Auto-join check:', {
      pin: !!pin,
      nickname: !!nickname,
      isConnected: nostr.isConnected,
      phase,
      connectedRelays: nostr.connectedRelays || 0,
      hasAttempted: hasAttemptedAutoJoinRef.current
    });
    
    if (pin && nickname && nostr.isConnected && !hasAttemptedAutoJoinRef.current) {
      console.log('🚀 Auto-joining game with PIN:', pin, 'nickname:', nickname);
      hasAttemptedAutoJoinRef.current = true;
      handleJoinGame(new Event('submit') as any);
    }
  }, [pin, nickname, nostr.isConnected, phase]);

  // Handle joining a game
  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🎯 handleJoinGame called with PIN:', pin, 'nickname:', nickname);
    
    if (!pin.trim() || !nickname.trim()) {
      console.log('❌ Missing PIN or nickname');
      setError('Please enter both PIN and nickname');
      return;
    }

    if (!nostr.isConnected) {
      console.log('❌ Not connected to Nostr');
      setError('Not connected to Nostr. Please wait...');
      return;
    }

    console.log('🚀 Starting join process...');
    setIsLoading(true);
    setError('');

    try {
      console.log('📞 Calling joinGameSession...');
      await joinGameSession(pin.trim(), nickname.trim());
      console.log('✅ Join successful, setting phase to lobby');
      setPhase('lobby');
    } catch (error) {
      console.error('❌ Join failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to join game');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (answerIndex: number) => {
    if (hasAnswered) return;
    setSelectedAnswer(answerIndex);
  };

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null || hasAnswered) return;

    setIsLoading(true);
    setError('');

    try {
      await submitAnswer(gameSession.currentQuestionIndex, selectedAnswer);
      setHasAnswered(true);
      setPhase('waiting');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to submit answer');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset for next question
  useEffect(() => {
    if (gameSession.currentQuestionIndex > 0) {
      setSelectedAnswer(null);
      setHasAnswered(false);
      setIsCorrect(null);
      setPhase('question');
    }
  }, [gameSession.currentQuestionIndex]);

  // Track score updates
  useEffect(() => {
    if (gameSession.scores && gameSession.scores.length > 0 && nostr.userPubkey) {
      const myScoreData = gameSession.scores.find(s => s.pubkey === nostr.userPubkey);
      if (myScoreData) {
        const previousScore = myScore;
        setMyScore(myScoreData.totalScore);
        setLastQuestionScore(myScoreData.totalScore - previousScore);
        
        // Calculate rank
        const sortedScores = [...gameSession.scores].sort((a, b) => b.totalScore - a.totalScore);
        const rank = sortedScores.findIndex(s => s.pubkey === nostr.userPubkey) + 1;
        setMyRank(rank);
        
        // Check if last answer was correct
        // Note: isCorrect is determined by comparing player's answer with correct answer
        // This will be handled in the answer feedback logic
        
        // Show results when scores are updated
        if (phase === 'waiting') {
          setPhase('results');
        }
      }
    }
  }, [gameSession.scores, nostr.userPubkey, phase]);

  // Update phase based on game session state
  useEffect(() => {
    console.log('🎮 Game phase update:', gameSession.gamePhase, 'current phase:', phase);
    
    if (gameSession.gamePhase === 'lobby' && phase !== 'lobby') {
      setPhase('lobby');
    } else if ((gameSession.gamePhase === 'playing' || gameSession.gamePhase === 'question') && !hasAnswered) {
      setPhase('question');
    } else if (gameSession.gamePhase === 'results') {
      setPhase('results');
    } else if (gameSession.gamePhase === 'finished') {
      setPhase('finished');
    }
  }, [gameSession.gamePhase, hasAnswered, phase]);

  // Get current question
  const getCurrentQuestion = () => {
    // First try to get the current question from game state (real-time)
    if (gameSession.currentQuestion) {
      return gameSession.currentQuestion;
    }
    
    // Fallback to quiz data if available
    if (!gameSession.quiz || gameSession.currentQuestionIndex >= gameSession.quiz.questions.length) {
      return null;
    }
    return gameSession.quiz.questions[gameSession.currentQuestionIndex];
  };

  // Get player's current score
  const getPlayerScore = () => {
    if (!nostr.userPubkey) return 0;
    const playerScore = gameSession.scores.find(s => s.pubkey === nostr.userPubkey);
    return playerScore?.totalScore || 0;
  };

  // Render joining phase
  const renderJoining = () => (
    <div className="player-container">
      <div className="join-section">
        <h1>Join Quiz Game</h1>
        
        <div className="connection-status">
          {nostr.isConnecting ? (
            <span className="status-connecting">🟡 Connecting to Nostr...</span>
          ) : nostr.isConnected ? (
            <span className="status-connected">🟢 Connected to Nostr</span>
          ) : (
            <span className="status-disconnected">🔴 Connection failed</span>
          )}
        </div>

        <form onSubmit={handleJoinGame} className="join-form">
          <div className="form-group">
            <label htmlFor="pin">Game PIN</label>
            <input
              id="pin"
              type="text"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter 6-digit PIN"
              maxLength={6}
              pattern="[0-9]{6}"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="nickname">Your Nickname</label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Enter your nickname"
              maxLength={20}
              required
            />
          </div>

          <button 
            type="submit" 
            className="join-button"
            disabled={isLoading || !nostr.isConnected}
          >
            {isLoading ? 'Joining...' : 'Join Game'}
          </button>
        </form>

        {error && <div className="error-message">{error}</div>}

        <button 
          className="back-button"
          onClick={() => navigate(ROUTES.HOME)}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );

  // Render lobby phase
  const renderLobby = () => (
    <div className="player-container">
      <div className="lobby-section">
        <h1>Waiting for Game to Start</h1>
        
        <div className="player-info">
          <h2>Welcome, {nickname}!</h2>
          <p>Game PIN: <strong>{pin}</strong></p>
        </div>

        <div className="lobby-status">
          <div className="waiting-animation">
            <div className="spinner"></div>
            <p>Waiting for host to start the quiz...</p>
          </div>
          
          <div className="players-count">
            <p>{gameSession.players.length} player(s) in the game</p>
          </div>
        </div>

        <button 
          className="leave-button"
          onClick={() => navigate(ROUTES.HOME)}
        >
          Leave Game
        </button>
      </div>
    </div>
  );

  // Render question phase
  const renderQuestion = () => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) {
      return (
        <div className="player-container">
          <div className="error-section">
            <h1>No Question Available</h1>
            <button onClick={() => navigate(ROUTES.HOME)}>Back to Home</button>
          </div>
        </div>
      );
    }

    return (
      <div className="player-container">
        <div className="question-section">
          <div className="question-header">
            <h2>Question {gameSession.currentQuestionIndex + 1}</h2>
            <div className="player-score">Score: {getPlayerScore()}</div>
          </div>

          <div className="question-display">
            <h3>{currentQuestion.text}</h3>
          </div>

          <div className="answer-options">
            {currentQuestion.options.map((option: string, index: number) => (
              <button
                key={index}
                className={`answer-button ${selectedAnswer === index ? 'selected' : ''}`}
                onClick={() => handleAnswerSelect(index)}
                disabled={hasAnswered}
              >
                <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                <span className="option-text">{option}</span>
              </button>
            ))}
          </div>

          <div className="question-controls">
            <button
              className="submit-button"
              onClick={handleSubmitAnswer}
              disabled={selectedAnswer === null || hasAnswered || isLoading}
            >
              {isLoading ? 'Submitting...' : hasAnswered ? 'Answer Submitted' : 'Submit Answer'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  };

  // Render waiting phase
  const renderWaiting = () => (
    <div className="player-container">
      <div className="waiting-section">
        <h1>Answer Submitted!</h1>
        
        <div className="waiting-animation">
          <div className="checkmark">✓</div>
          <p>Waiting for other players...</p>
        </div>

        <div className="player-score">
          <h3>Your Score: {getPlayerScore()}</h3>
        </div>
      </div>
    </div>
  );

  // Render results phase
  const renderResults = () => {
    if (!gameSession.quiz) return null;
    
    const currentQuestion = gameSession.quiz.questions[gameSession.currentQuestionIndex];
    const correctAnswerIndex = currentQuestion.correct_index;
    const correctAnswer = currentQuestion.options[correctAnswerIndex];
    
    return (
      <div className="player-container">
        <div className="results-section">
          <div className="answer-result">
            <div className={`result-indicator ${isCorrect ? 'correct' : 'wrong'}`}>
              {isCorrect ? '✅ Correct!' : '❌ Wrong'}
            </div>
            
            <div className="correct-answer">
              <h3>Correct Answer:</h3>
              <div className="answer-reveal">
                <span className="option-letter correct">{String.fromCharCode(65 + correctAnswerIndex)}</span>
                <span className="option-text">{correctAnswer}</span>
              </div>
            </div>
            
            <div className="score-update">
              <h3>Your Score</h3>
              <div className="score-change">
                {lastQuestionScore > 0 ? `+${lastQuestionScore}` : '+0'} points
              </div>
              <div className="total-score">
                Total: {myScore} points
              </div>
            </div>
          </div>
          
          <div className="current-ranking">
            <h3>Current Ranking</h3>
            <div className="rank-display">
              #{myRank} of {gameSession.players.length}
            </div>
          </div>
          
          <div className="waiting-next">
            <p>Waiting for next question...</p>
            <div className="loading-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render finished phase
  const renderFinished = () => (
    <div className="player-container">
      <div className="finished-section">
        <h1>🏆 Quiz Complete!</h1>
        
        <div className="final-results">
          <h2>Final Score: {getPlayerScore()} points</h2>
          
          {(() => {
            const playerRank = gameSession.scores
              .sort((a, b) => b.totalScore - a.totalScore)
              .findIndex(s => s.pubkey === nostr.userPubkey) + 1;
            
            let message = '';
            let emoji = '';
            
            if (playerRank === 1) {
              message = 'Congratulations! You won!';
              emoji = '🥇';
            } else if (playerRank === 2) {
              message = 'Great job! Second place!';
              emoji = '🥈';
            } else if (playerRank === 3) {
              message = 'Well done! Third place!';
              emoji = '🥉';
            } else {
              message = `You finished in ${playerRank}${playerRank === 11 || playerRank === 12 || playerRank === 13 ? 'th' : 
                playerRank % 10 === 1 ? 'st' : 
                playerRank % 10 === 2 ? 'nd' : 
                playerRank % 10 === 3 ? 'rd' : 'th'} place!`;
              emoji = '🎯';
            }
            
            return (
              <div className="final-position">
                <div className="position-emoji">{emoji}</div>
                <p>{message}</p>
              </div>
            );
          })()}
        </div>

        <div className="finished-controls">
          <button 
            className="home-button"
            onClick={() => navigate(ROUTES.HOME)}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  // Render based on current phase
  switch (phase) {
    case 'joining':
      return renderJoining();
    case 'lobby':
      return renderLobby();
    case 'question':
      return renderQuestion();
    case 'waiting':
      return renderWaiting();
    case 'results':
      return renderResults();
    case 'finished':
      return renderFinished();
    default:
      return renderJoining();
  }
}

export default PlayerPageReal;