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
  gamePhase: 'lobby' | 'question' | 'results' | 'finished';
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
    gamePhase: 'lobby',
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
      gamePhase: 'lobby',
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
      nostrService.current.subscribeToGameSession(sessionId);

      return sessionId;
    } catch (error) {
      console.error('❌ Failed to create game session:', error);
      throw error;
    }
  }, [nostrState.isConnected]);

  // Join a game session (player)
  const joinGameSession = useCallback(async (pin: string, nickname: string) => {
    if (!nostrState.isConnected) {
      throw new Error('Not connected to Nostr');
    }

    try {
      // Find session by PIN
      nostrService.current.findGameSessionByPin(pin);
      
      // Wait for session to be found (this is a simplified approach)
      // In a real implementation, you'd want to handle this more robustly
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // For now, we'll simulate finding a session
      // In the real implementation, this would be handled by event listeners
      const mockSessionId = `session_${pin}_${Date.now()}`;
      
      await nostrService.current.joinGameSession(mockSessionId, nickname);
      
      setGameSessionState(prev => ({
        ...prev,
        sessionId: mockSessionId,
        pin,
        gamePhase: 'lobby',
      }));

      // Subscribe to session events
      nostrService.current.subscribeToGameSession(mockSessionId);

      return mockSessionId;
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

  // Set up event handlers
  useEffect(() => {
    const service = nostrService.current;

    // Handler for player joins
    const handlePlayerJoin = (event: Event) => {
      try {
        const joinData = JSON.parse(event.content);
        const newPlayer = {
          pubkey: event.pubkey,
          nickname: joinData.nickname,
          joinedAt: joinData.joined_at,
        };

        setGameSessionState(prev => ({
          ...prev,
          players: [...prev.players.filter(p => p.pubkey !== event.pubkey), newPlayer],
        }));
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
    service.addEventListener(NOSTR_KINDS.GAME_SESSION, handleGameSession);

    // Store handlers for cleanup
    eventHandlersRef.current.set(NOSTR_KINDS.PLAYER_JOIN, handlePlayerJoin);
    eventHandlersRef.current.set(NOSTR_KINDS.ANSWER, handleAnswer);
    eventHandlersRef.current.set(NOSTR_KINDS.SCORE_UPDATE, handleScoreUpdate);
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
    submitAnswer,
    updateScores,
    
    // Utilities
    isHost: gameSessionState.sessionId !== null && nostrState.userPubkey !== null,
    isPlayer: gameSessionState.sessionId !== null,
  };
}

export default useNostrReal;