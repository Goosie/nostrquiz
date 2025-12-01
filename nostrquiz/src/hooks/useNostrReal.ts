import { useState, useEffect, useCallback, useRef } from 'react';
import { Event } from 'nostr-tools';
import { getNostrService, NOSTR_KINDS } from '../services/nostrReal';
import { Quiz } from '../types';

export interface NostrState {
  isConnected: boolean;
  isConnecting: boolean;
  userPubkey: string | null;
  connectedRelays: number;
  totalRelays: number;
  error: string | null;
}

export interface GameSessionState {
  sessionId: string | null;
  pin: string | null;
  quiz: Quiz | null;
  players: Array<{
    pubkey: string;
    nickname: string;
    joinedAt: number;
  }>;
  currentQuestionIndex: number;
  currentQuestion: any;
  gamePhase: 'lobby' | 'playing' | 'question' | 'results' | 'finished';
  timeLimit: number;
  startTime: number;
  scores: Array<{
    pubkey: string;
    nickname: string;
    totalScore: number;
  }>;
  answers: Array<{
    pubkey: string;
    questionIndex: number;
    answerIndex: number;
    timeMs: number;
  }>;
}

export function useNostrReal() {
  const [nostrState, setNostrState] = useState<NostrState>({
    isConnected: false,
    isConnecting: false,
    userPubkey: null,
    connectedRelays: 0,
    totalRelays: 0,
    error: null,
  });

  const [gameSessionState, setGameSessionState] = useState<GameSessionState>({
    sessionId: null,
    pin: null,
    quiz: null,
    players: [],
    currentQuestionIndex: 0,
    currentQuestion: null,
    gamePhase: 'lobby',
    timeLimit: 20,
    startTime: 0,
    scores: [],
    answers: [],
  });

  const nostrService = useRef(getNostrService());
  const eventHandlersRef = useRef<Map<number, (event: Event) => void>>(new Map());

  // Initialize Nostr connection
  const connect = useCallback(async () => {
    if (nostrState.isConnecting || nostrState.isConnected) {
      return;
    }

    setNostrState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Initialize user identity
      const pubkey = await nostrService.current.initializeUser();
      
      // Connect to relays
      const connected = await nostrService.current.connect();
      
      if (connected) {
        const status = nostrService.current.getConnectionStatus();
        setNostrState(prev => ({
          ...prev,
          isConnected: true,
          isConnecting: false,
          userPubkey: pubkey,
          connectedRelays: status.connectedRelays,
          totalRelays: status.totalRelays,
        }));
      } else {
        throw new Error('Failed to connect to any relays');
      }
    } catch (error) {
      console.error('❌ Failed to connect to Nostr:', error);
      setNostrState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, [nostrState.isConnecting, nostrState.isConnected]);

  // Disconnect from Nostr
  const disconnect = useCallback(() => {
    nostrService.current.disconnect();
    setNostrState({
      isConnected: false,
      isConnecting: false,
      userPubkey: null,
      connectedRelays: 0,
      totalRelays: 0,
      error: null,
    });
    setGameSessionState({
      sessionId: null,
      pin: null,
      quiz: null,
      players: [],
      currentQuestionIndex: 0,
      currentQuestion: null,
      gamePhase: 'lobby',
      timeLimit: 20,
      startTime: 0,
      scores: [],
      answers: [],
    });
  }, []);

  // Create a game session (host)
  const createGameSession = useCallback(async (quiz: Quiz, pin: string) => {
    if (!nostrState.isConnected) {
      throw new Error('Not connected to Nostr');
    }

    try {
      const sessionId = await nostrService.current.createGameSession(quiz, pin);
      
      console.log(`🎮 Game session created with ID: ${sessionId}`);
      
      setGameSessionState(prev => ({
        ...prev,
        sessionId,
        pin,
        quiz,
        gamePhase: 'lobby',
        players: [],
        scores: [],
        answers: [],
        currentQuestionIndex: 0,
      }));

      // Subscribe to session events
      console.log(`🔔 Setting up subscription for session: ${sessionId}`);
      nostrService.current.subscribeToGameSession(sessionId);

      return sessionId;
    } catch (error) {
      console.error('❌ Failed to create game session:', error);
      throw error;
    }
  }, [nostrState.isConnected]);

  // Find session by PIN (helper function)
  const findSessionByPin = useCallback(async (pin: string): Promise<string | null> => {
    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      // Set up temporary handler for game session events
      const handleGameSession = (event: Event) => {
        try {
          // Parse content to validate it's a proper session event
          JSON.parse(event.content);
          const eventPin = event.tags.find(tag => tag[0] === 'd')?.[1];
          
          if (eventPin === pin) {
            clearTimeout(timeoutId);
            nostrService.current.removeEventListener(NOSTR_KINDS.GAME_SESSION, handleGameSession);
            resolve(event.id);
          }
        } catch (error) {
          console.error('❌ Error parsing game session event:', error);
        }
      };
      
      // Add temporary event handler
      nostrService.current.addEventListener(NOSTR_KINDS.GAME_SESSION, handleGameSession);
      
      // Start searching for the session
      nostrService.current.findGameSessionByPin(pin);
      
      // Set timeout to avoid waiting forever
      timeoutId = setTimeout(() => {
        nostrService.current.removeEventListener(NOSTR_KINDS.GAME_SESSION, handleGameSession);
        resolve(null);
      }, 5000); // 5 second timeout
    });
  }, []);

  // Join a game session (player)
  const joinGameSession = useCallback(async (pin: string, nickname: string) => {
    if (!nostrState.isConnected) {
      throw new Error('Not connected to Nostr');
    }

    try {
      // Find session by PIN and wait for result
      const sessionId = await findSessionByPin(pin);
      
      if (!sessionId) {
        throw new Error('Game session not found');
      }
      
      await nostrService.current.joinGameSession(sessionId, nickname);
      
      setGameSessionState(prev => ({
        ...prev,
        sessionId,
        pin,
        gamePhase: 'lobby',
      }));

      // Subscribe to session events
      nostrService.current.subscribeToGameSession(sessionId);

      return sessionId;
    } catch (error) {
      console.error('❌ Failed to join game session:', error);
      throw error;
    }
  }, [nostrState.isConnected]);

  // Submit an answer (player)
  const submitAnswer = useCallback(async (questionIndex: number, answerIndex: number) => {
    if (!gameSessionState.sessionId) {
      throw new Error('No active game session');
    }

    try {
      await nostrService.current.submitAnswer(
        gameSessionState.sessionId,
        questionIndex,
        answerIndex
      );
    } catch (error) {
      console.error('❌ Failed to submit answer:', error);
      throw error;
    }
  }, [gameSessionState.sessionId]);

  // Update scores (host)
  const updateScores = useCallback(async (questionIndex: number, scores: any[]) => {
    if (!gameSessionState.sessionId) {
      throw new Error('No active game session');
    }

    try {
      await nostrService.current.updateScores(
        gameSessionState.sessionId,
        questionIndex,
        scores
      );
      
      setGameSessionState(prev => ({
        ...prev,
        scores,
        currentQuestionIndex: questionIndex + 1,
      }));
    } catch (error) {
      console.error('❌ Failed to update scores:', error);
      throw error;
    }
  }, [gameSessionState.sessionId]);

  // Start the game (host)
  const startGame = useCallback(async (quiz: any) => {
    if (!gameSessionState.sessionId) {
      throw new Error('No active game session');
    }

    try {
      console.log('🎮 HOST: 🚀 Starting game with quiz:', quiz);
      console.log('🎮 HOST: Session ID:', gameSessionState.sessionId);
      
      // Update local state first
      setGameSessionState(prev => ({
        ...prev,
        gamePhase: 'playing',
        currentQuestionIndex: 0,
        currentQuestion: quiz.questions[0],
        quiz,
        timeLimit: quiz.questions[0]?.time_limit_seconds || 20,
        startTime: Date.now(),
      }));

      // Publish game state to all players
      await nostrService.current.publishGameState(gameSessionState.sessionId, {
        phase: 'playing',
        currentQuestionIndex: 0,
        currentQuestion: quiz.questions[0],
        timeLimit: quiz.questions[0]?.time_limit_seconds || 20,
        startTime: Date.now(),
      });

      console.log('🎮 HOST: ✅ Game started successfully');
    } catch (error) {
      console.error('❌ Failed to start game:', error);
      throw error;
    }
  }, [gameSessionState.sessionId]);

  // Set up event handlers
  useEffect(() => {
    const service = nostrService.current;

    // Handler for player joins
    const handlePlayerJoin = (event: Event) => {
      try {
        console.log('🎮 Player join event received:', event);
        const joinData = JSON.parse(event.content);
        const newPlayer = {
          pubkey: event.pubkey,
          nickname: joinData.nickname,
          joinedAt: joinData.joined_at,
        };

        console.log('👤 Adding new player:', newPlayer);
        setGameSessionState(prev => {
          const updatedState = {
            ...prev,
            players: [...prev.players.filter(p => p.pubkey !== event.pubkey), newPlayer],
          };
          console.log('📊 Updated game state:', updatedState);
          return updatedState;
        });
      } catch (error) {
        console.error('❌ Error handling player join:', error);
      }
    };

    // Handler for answers
    const handleAnswer = (event: Event) => {
      try {
        const answerData = JSON.parse(event.content);
        const newAnswer = {
          pubkey: event.pubkey,
          questionIndex: answerData.question_index,
          answerIndex: answerData.answer_index,
          timeMs: answerData.time_ms,
        };

        setGameSessionState(prev => ({
          ...prev,
          answers: [...prev.answers, newAnswer],
        }));
      } catch (error) {
        console.error('❌ Error handling answer:', error);
      }
    };

    // Handler for score updates
    const handleScoreUpdate = (event: Event) => {
      try {
        const scoreData = JSON.parse(event.content);
        setGameSessionState(prev => ({
          ...prev,
          scores: scoreData.scores,
          currentQuestionIndex: scoreData.question_index + 1,
        }));
      } catch (error) {
        console.error('❌ Error handling score update:', error);
      }
    };

    // Handler for game state updates (phase changes, current question)
    const handleGameState = (event: Event) => {
      try {
        const gameStateData = JSON.parse(event.content);
        console.log('🎮 PLAYER: Game state update received:', gameStateData);
        console.log('🎮 PLAYER: Event kind:', event.kind, 'Expected:', NOSTR_KINDS.GAME_STATE);
        
        setGameSessionState(prev => ({
          ...prev,
          gamePhase: gameStateData.phase,
          currentQuestionIndex: gameStateData.currentQuestionIndex || prev.currentQuestionIndex,
          currentQuestion: gameStateData.currentQuestion || prev.currentQuestion,
          timeLimit: gameStateData.timeLimit || prev.timeLimit,
          startTime: gameStateData.startTime || prev.startTime,
        }));
      } catch (error) {
        console.error('❌ Error handling game state:', error);
      }
    };

    // Handler for game sessions (when searching by PIN)
    const handleGameSession = (event: Event) => {
      try {
        const sessionData = JSON.parse(event.content);
        console.log('🎮 Found game session:', sessionData);
        
        // This would be used when a player searches for a session by PIN
        // The actual joining logic would happen after this
      } catch (error) {
        console.error('❌ Error handling game session:', error);
      }
    };

    // Register event handlers
    service.addEventListener(NOSTR_KINDS.PLAYER_JOIN, handlePlayerJoin);
    service.addEventListener(NOSTR_KINDS.ANSWER, handleAnswer);
    service.addEventListener(NOSTR_KINDS.SCORE_UPDATE, handleScoreUpdate);
    service.addEventListener(NOSTR_KINDS.GAME_STATE, handleGameState);
    service.addEventListener(NOSTR_KINDS.GAME_SESSION, handleGameSession);

    // Store handlers for cleanup
    eventHandlersRef.current.set(NOSTR_KINDS.PLAYER_JOIN, handlePlayerJoin);
    eventHandlersRef.current.set(NOSTR_KINDS.ANSWER, handleAnswer);
    eventHandlersRef.current.set(NOSTR_KINDS.SCORE_UPDATE, handleScoreUpdate);
    eventHandlersRef.current.set(NOSTR_KINDS.GAME_STATE, handleGameState);
    eventHandlersRef.current.set(NOSTR_KINDS.GAME_SESSION, handleGameSession);

    // Cleanup function
    return () => {
      eventHandlersRef.current.forEach((handler, kind) => {
        service.removeEventListener(kind, handler);
      });
      eventHandlersRef.current.clear();
    };
  }, []);

  // Update connection status periodically
  useEffect(() => {
    if (!nostrState.isConnected) return;

    const interval = setInterval(() => {
      const status = nostrService.current.getConnectionStatus();
      setNostrState(prev => ({
        ...prev,
        isConnected: status.isConnected,
        connectedRelays: status.connectedRelays,
        totalRelays: status.totalRelays,
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [nostrState.isConnected]);

  return {
    // Nostr state
    nostr: nostrState,
    
    // Game session state
    gameSession: gameSessionState,
    
    // Actions
    connect,
    disconnect,
    createGameSession,
    joinGameSession,
    startGame,
    submitAnswer,
    updateScores,
    
    // Utilities
    isHost: gameSessionState.sessionId !== null && nostrState.userPubkey !== null,
    isPlayer: gameSessionState.sessionId !== null,
  };
}

export default useNostrReal;