import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNostrReal } from '../hooks/useNostrReal';
import { FormstrService } from '../services/formstr';
import { Quiz } from '../types';
import { ROUTES } from '../utils/constants';

type GamePhase = 'setup' | 'lobby' | 'question' | 'results' | 'finished';

export function HostPageReal() {
  const navigate = useNavigate();
  const { nostr, gameSession, connect, disconnect, createGameSession, startGame, processAnswersAndCalculateScores } = useNostrReal();
  
  const [phase, setPhase] = useState<GamePhase>('setup');
  const [availableQuizzes, setAvailableQuizzes] = useState<Quiz[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz | null>(null);
  const [gamePin, setGamePin] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [questionTimer, setQuestionTimer] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [currentScores, setCurrentScores] = useState<any[]>([]);

  // Load available quizzes
  useEffect(() => {
    const loadQuizzes = async () => {
      try {
        const formstrService = new FormstrService();
        const quizzes = formstrService.createDemoQuizzes();
        setAvailableQuizzes(quizzes);
      } catch (error) {
        console.error('Failed to load quizzes:', error);
        setError('Failed to load quizzes');
      }
    };

    loadQuizzes();
  }, []);

  // Handle Nostr connection
  const handleConnect = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      await connect();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle quiz selection and game creation
  const handleStartGame = async () => {
    if (!selectedQuiz) {
      setError('Please select a quiz');
      return;
    }

    if (!nostr.isConnected) {
      setError('Please connect to Nostr first');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Generate random PIN
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Create game session
      await createGameSession(selectedQuiz, pin);
      setGamePin(pin);
      setPhase('lobby');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  };

  // Start the quiz (move to first question)
  const handleStartQuiz = async () => {
    console.log('🎮 HOST: handleStartQuiz called');
    console.log('🎮 HOST: selectedQuiz:', selectedQuiz);
    console.log('🎮 HOST: gameSession:', gameSession);
    
    if (!selectedQuiz) {
      console.log('🎮 HOST: ❌ No quiz selected');
      setError('No quiz selected');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('🎮 HOST: About to call startGame...');
      await startGame(selectedQuiz);
      console.log('🎮 HOST: startGame completed successfully');
      setPhase('question');
      setCurrentQuestionIndex(0);
      startQuestionTimer(0);
    } catch (error) {
      console.log('🎮 HOST: ❌ Error in startGame:', error);
      setError(error instanceof Error ? error.message : 'Failed to start quiz');
    } finally {
      setIsLoading(false);
    }
  };

  // Start timer for current question
  const startQuestionTimer = (questionIndex: number) => {
    if (!selectedQuiz) return;
    
    const question = selectedQuiz.questions[questionIndex];
    const timeLimit = question.time_limit_seconds || 20;
    
    setTimeRemaining(timeLimit);
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleQuestionTimeout(questionIndex);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setQuestionTimer(timer as any);
  };

  // Handle question timeout - process answers and show results
  const handleQuestionTimeout = async (questionIndex: number) => {
    console.log('⏰ HOST: Question timeout for question', questionIndex);
    
    try {
      const scores = await processAnswersAndCalculateScores(questionIndex);
      setCurrentScores(scores);
      setPhase('results');
    } catch (error) {
      console.error('❌ Error processing answers:', error);
      setError('Failed to process answers');
    }
  };

  // Move to next question or finish game
  const handleNextQuestion = async () => {
    if (!selectedQuiz) return;
    
    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex >= selectedQuiz.questions.length) {
      // Game finished
      setPhase('finished');
      return;
    }
    
    // Move to next question
    setCurrentQuestionIndex(nextIndex);
    setPhase('question');
    startQuestionTimer(nextIndex);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (questionTimer) {
        clearInterval(questionTimer);
      }
    };
  }, [questionTimer]);



  // Show results/leaderboard


  // Reset game
  const handleResetGame = () => {
    setPhase('setup');
    setSelectedQuiz(null);
    setGamePin('');
    setError('');
  };

  // Render setup phase
  const renderSetup = () => (
    <div className="host-container">
      <div className="host-header">
        <h1>Host a Quiz Game</h1>
        <button 
          className="back-button"
          onClick={() => navigate(ROUTES.HOME)}
        >
          ← Back to Home
        </button>
      </div>

      {/* Connection Status */}
      <div className="connection-section">
        <h2>Connection Status</h2>
        <div className="connection-status">
          {nostr.isConnecting ? (
            <span className="status-connecting">🟡 Connecting...</span>
          ) : nostr.isConnected ? (
            <span className="status-connected">
              🟢 Connected ({nostr.connectedRelays}/{nostr.totalRelays} relays)
            </span>
          ) : (
            <span className="status-disconnected">🔴 Not Connected</span>
          )}
        </div>
        
        {!nostr.isConnected && (
          <button 
            className="connect-button"
            onClick={handleConnect}
            disabled={isLoading}
          >
            {isLoading ? 'Connecting...' : 'Connect to Nostr'}
          </button>
        )}

        {nostr.isConnected && (
          <div className="user-info">
            <p>Your pubkey: <code>{nostr.userPubkey?.slice(0, 16)}...</code></p>
            <button className="disconnect-button" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Quiz Selection */}
      {nostr.isConnected && (
        <div className="quiz-selection">
          <h2>Select a Quiz</h2>
          {availableQuizzes.length === 0 ? (
            <p>Loading quizzes...</p>
          ) : (
            <div className="quiz-list">
              {availableQuizzes.map(quiz => (
                <div 
                  key={quiz.id}
                  className={`quiz-card ${selectedQuiz?.id === quiz.id ? 'selected' : ''}`}
                  onClick={() => setSelectedQuiz(quiz)}
                >
                  <h3>{quiz.title}</h3>
                  <p>{quiz.description}</p>
                  <div className="quiz-meta">
                    <span>{quiz.questions.length} questions</span>
                    <span>{quiz.language}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedQuiz && (
            <button 
              className="start-game-button"
              onClick={handleStartGame}
              disabled={isLoading}
            >
              {isLoading ? 'Creating Game...' : 'Start Game'}
            </button>
          )}
        </div>
      )}

      {error && <div className="error-message">{error}</div>}
    </div>
  );

  // Render lobby phase
  const renderLobby = () => (
    <div className="host-container">
      <div className="lobby-section">
        <h1>Game Lobby</h1>
        
        <div className="pin-display">
          <h2>Game PIN</h2>
          <div className="pin-code">{gamePin}</div>
          <p>Players can join at: <strong>/join</strong></p>
        </div>

        <div className="players-section">
          <h3>Players ({gameSession.players.length})</h3>
          {gameSession.players.length === 0 ? (
            <p>Waiting for players to join...</p>
          ) : (
            <div className="players-list">
              {gameSession.players.map(player => (
                <div key={player.pubkey} className="player-item">
                  <span className="player-nickname">{player.nickname}</span>
                  <span className="player-pubkey">{player.pubkey.slice(0, 8)}...</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lobby-controls">
          <button 
            className="start-quiz-button"
            onClick={handleStartQuiz}
            disabled={gameSession.players.length === 0}
          >
            Start Quiz
          </button>
          <button className="cancel-button" onClick={handleResetGame}>
            Cancel Game
          </button>
        </div>
      </div>
    </div>
  );

  // Render question phase
  const renderQuestion = () => {
    if (!selectedQuiz) return null;
    
    const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
    const answeredPlayers = gameSession.answers.filter(
      a => a.questionIndex === currentQuestionIndex
    ).length;

    return (
      <div className="host-container">
        <div className="question-section">
          <div className="question-header">
            <h2>Question {currentQuestionIndex + 1} of {selectedQuiz.questions.length}</h2>
            <div className="question-timer">
              ⏱️ {timeRemaining}s remaining
            </div>
            <div className="question-stats">
              {answeredPlayers}/{gameSession.players.length} answered
            </div>
          </div>

          <div className="question-display">
            <h3>{currentQuestion.text}</h3>
            <div className="answer-options">
              {currentQuestion.options.map((option, index) => (
                <div key={index} className="answer-option">
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="question-controls">
            <button 
              className="skip-button"
              onClick={() => handleQuestionTimeout(currentQuestionIndex)}
            >
              Skip to Results
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render results phase
  const renderResults = () => {
    if (!selectedQuiz) return null;
    
    const currentQuestion = selectedQuiz.questions[currentQuestionIndex];
    const correctAnswerIndex = currentQuestion.correct_index;
    const correctAnswer = currentQuestion.options[correctAnswerIndex];
    
    return (
      <div className="host-container">
        <div className="results-section">
          <h1>Question {currentQuestionIndex + 1} Results</h1>
          
          <div className="correct-answer">
            <h3>Correct Answer:</h3>
            <div className="answer-reveal">
              <span className="option-letter correct">{String.fromCharCode(65 + correctAnswerIndex)}</span>
              <span className="option-text">{correctAnswer}</span>
            </div>
          </div>
          
          <div className="leaderboard">
            <h3>Current Leaderboard</h3>
            {currentScores
              .sort((a, b) => b.totalScore - a.totalScore)
              .map((score, index) => (
                <div key={score.pubkey} className={`leaderboard-row ${score.isCorrect ? 'correct' : 'wrong'}`}>
                  <span className="rank">#{index + 1}</span>
                  <span className="nickname">{score.nickname}</span>
                  <span className="question-score">
                    {score.isCorrect ? '✅' : '❌'} +{score.questionScore}
                  </span>
                  <span className="total-score">{score.totalScore} pts</span>
                </div>
              ))}
          </div>

          <div className="results-controls">
            <button className="continue-button" onClick={handleNextQuestion}>
              {currentQuestionIndex + 1 >= selectedQuiz.questions.length 
                ? 'Show Final Results' 
                : 'Next Question'
              }
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render finished phase
  const renderFinished = () => (
    <div className="host-container">
      <div className="finished-section">
        <h1>🎉 Quiz Complete!</h1>
        
        <div className="final-leaderboard">
          <h2>Final Results</h2>
          {currentScores
            .sort((a, b) => b.totalScore - a.totalScore)
            .map((score, index) => (
              <div key={score.pubkey} className={`final-leaderboard-row ${index === 0 ? 'winner' : ''}`}>
                <span className="final-rank">
                  {index === 0 ? '🏆' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                </span>
                <span className="final-nickname">{score.nickname}</span>
                <span className="final-score">{score.totalScore} pts</span>
              </div>
            ))}
        </div>

        <div className="finished-controls">
          <button className="new-game-button" onClick={handleResetGame}>
            Start New Game
          </button>
          <button className="home-button" onClick={() => navigate(ROUTES.HOME)}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );

  // Render based on current phase
  switch (phase) {
    case 'setup':
      return renderSetup();
    case 'lobby':
      return renderLobby();
    case 'question':
      return renderQuestion();
    case 'results':
      return renderResults();
    case 'finished':
      return renderFinished();
    default:
      return renderSetup();
  }
}

export default HostPageReal;