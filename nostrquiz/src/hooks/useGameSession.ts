import { useState, useEffect, useCallback } from 'react';
import { getNostrWebSocketService } from '../services/nostrWebSocket';
import { GameSession, PlayerJoin, Answer, ScoreUpdate, Player } from '../types';
import { generateGamePin } from '../utils/helpers';

export interface GameSessionState {
  session: GameSession | null;
  players: Player[];
  currentQuestionIndex: number;
  gameState: 'lobby' | 'question' | 'results' | 'finished';
  answers: Answer[];
  scores: { [playerPubkey: string]: number };
  loading: boolean;
  error: string | null;
}

export function useGameSession() {
  const [state, setState] = useState<GameSessionState>({
    session: null,
    players: [],
    currentQuestionIndex: 0,
    gameState: 'lobby',
    answers: [],
    scores: {},
    loading: false,
    error: null
  });

  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);

  // Handle incoming game events from Nostr
  const handleGameEvent = useCallback((event: any) => {
    try {
      const eventData = JSON.parse(event.content);

      switch (event.kind) {
        case 35002: // Player Join
          const playerJoin: PlayerJoin = {
            session_id: eventData.session_id,
            session_event_id: eventData.session_id,
            player_pubkey: event.pubkey,
            nickname: eventData.nickname,
            created_at: event.created_at
          };
          handlePlayerJoin(playerJoin);
          break;

        case 35003: // Answer
          const answer: Answer = {
            session_id: eventData.session_id,
            session_event_id: eventData.session_id,
            player_pubkey: event.pubkey,
            question_index: eventData.question_index,
            answer_index: eventData.answer_index,
            time_ms: eventData.time_ms,
            created_at: event.created_at
          };
          handleAnswer(answer);
          break;

        case 35004: // Score Update
          const scoreUpdate: ScoreUpdate = {
            session_id: eventData.session_id,
            session_event_id: eventData.session_id,
            question_index: eventData.question_index,
            scores: eventData.scores,
            created_at: event.created_at
          };
          handleScoreUpdate(scoreUpdate);
          break;

        default:
          console.log('Unhandled event kind:', event.kind);
      }
    } catch (error) {
      console.error('Error handling game event:', error);
    }
  }, []);

  // Create a new game session
  const createSession = useCallback(async (quizId: string, hostPubkey: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const pin = generateGamePin();
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      const session: GameSession = {
        id: sessionId,
        quiz_id: quizId,
        host_pubkey: hostPubkey,
        pin,
        settings: {
          time_per_question: 20,
          points_mode: 'standard'
        },
        created_at: Math.floor(Date.now() / 1000)
      };

      // Publish session to Nostr
      const nostrService = getNostrWebSocketService();
      const publishedSessionId = await nostrService.createGameSession(quizId, pin, session.settings);
      
      setState(prev => ({
        ...prev,
        session: { ...session, id: publishedSessionId || sessionId },
        loading: false,
        gameState: 'lobby'
      }));

      // Subscribe to session events
      const subId = nostrService.subscribeToGameSession(sessionId, handleGameEvent);
      setSubscriptionId(subId);

      return { ...session, id: sessionId };
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to create session'
      }));
      throw error;
    }
  }, []);

  // Join an existing session
  const joinSession = useCallback(async (pin: string, nickname: string, playerPubkey?: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const nostrService = getNostrWebSocketService();
      
      // Find session by PIN
      let sessionFound = false;
      const findSubId = nostrService.findGameSessionByPin(pin, async (event: any) => {
        if (sessionFound) return;
        sessionFound = true;

        try {
          const sessionData = JSON.parse(event.content);
          const session: GameSession = {
            id: event.id,
            quiz_id: sessionData.quiz_id,
            host_pubkey: event.pubkey,
            pin: sessionData.pin,
            settings: sessionData.settings,
            created_at: sessionData.created_at
          };

          // Generate ephemeral keypair if no pubkey provided
          let finalPlayerPubkey = playerPubkey;
          let privateKey: Uint8Array | undefined;
          
          if (!finalPlayerPubkey) {
            const ephemeral = nostrService.generateEphemeralKeypair();
            finalPlayerPubkey = ephemeral.publicKey;
            privateKey = ephemeral.privateKey;
            // Store ephemeral key in session storage for this session
            sessionStorage.setItem(`ephemeral_key_${session.id}`, JSON.stringify(Array.from(ephemeral.privateKey)));
          }

          // Join the session
          await nostrService.joinGameSession(session.id, nickname, privateKey);

          setState(prev => ({
            ...prev,
            session,
            loading: false,
            gameState: 'lobby'
          }));

          // Subscribe to session events
          const subId = nostrService.subscribeToGameSession(session.id, handleGameEvent);
          setSubscriptionId(subId);

          // Cleanup the find subscription
          nostrService.unsubscribe(findSubId);
        } catch (error) {
          console.error('Error joining session:', error);
          setState(prev => ({
            ...prev,
            loading: false,
            error: 'Failed to join session'
          }));
        }
      });

      // Timeout after 10 seconds if session not found
      setTimeout(() => {
        if (!sessionFound) {
          nostrService.unsubscribe(findSubId);
          setState(prev => ({
            ...prev,
            loading: false,
            error: `Game session with PIN ${pin} not found`
          }));
        }
      }, 10000);

    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to join session'
      }));
      throw error;
    }
  }, []);

  // Handle player join events
  const handlePlayerJoin = useCallback((join: PlayerJoin) => {
    setState(prev => {
      const existingPlayer = prev.players.find(p => p.pubkey === join.player_pubkey);
      if (existingPlayer) {
        return prev; // Player already exists
      }

      const newPlayer: Player = {
        pubkey: join.player_pubkey,
        nickname: join.nickname,
        score: 0,
        connected: true
      };

      return {
        ...prev,
        players: [...prev.players, newPlayer],
        scores: {
          ...prev.scores,
          [join.player_pubkey]: 0
        }
      };
    });
  }, []);

  // Handle answer events
  const handleAnswer = useCallback((answer: Answer) => {
    setState(prev => ({
      ...prev,
      answers: [...prev.answers, answer]
    }));
  }, []);

  // Handle score update events
  const handleScoreUpdate = useCallback((scoreUpdate: ScoreUpdate) => {
    setState(prev => {
      const newScores: { [key: string]: number } = {};
      const updatedPlayers = prev.players.map(player => {
        const scoreEntry = scoreUpdate.scores.find(s => s.player_pubkey === player.pubkey);
        if (scoreEntry) {
          newScores[player.pubkey] = scoreEntry.total_score;
          return { ...player, score: scoreEntry.total_score };
        }
        return player;
      });

      return {
        ...prev,
        players: updatedPlayers,
        scores: { ...prev.scores, ...newScores },
        currentQuestionIndex: scoreUpdate.question_index + 1
      };
    });
  }, []);

  // Submit an answer
  const submitAnswer = useCallback(async (questionIndex: number, answerIndex: number, _playerPubkey: string, timeMs?: number) => {
    if (!state.session) {
      throw new Error('No active session');
    }

    try {
      const nostrService = getNostrWebSocketService();
      
      // Get stored ephemeral key if available
      let privateKey: Uint8Array | undefined;
      const storedKey = sessionStorage.getItem(`ephemeral_key_${state.session.id}`);
      if (storedKey) {
        const keyArray = JSON.parse(storedKey);
        privateKey = new Uint8Array(keyArray);
      }

      await nostrService.submitAnswer(state.session.id, questionIndex, answerIndex, timeMs || 0, privateKey);
    } catch (error) {
      console.error('Error submitting answer:', error);
      throw error;
    }
  }, [state.session]);

  // Start the game (move from lobby to first question)
  const startGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      gameState: 'question',
      currentQuestionIndex: 0
    }));
  }, []);

  // Move to next question
  const nextQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      gameState: 'question',
      currentQuestionIndex: prev.currentQuestionIndex + 1
    }));
  }, []);

  // Show results for current question
  const showResults = useCallback(() => {
    setState(prev => ({
      ...prev,
      gameState: 'results'
    }));
  }, []);

  // End the game
  const endGame = useCallback(() => {
    setState(prev => ({
      ...prev,
      gameState: 'finished'
    }));
  }, []);

  // Publish score update
  const publishScoreUpdate = useCallback(async (questionIndex: number, scores: Array<{ player_pubkey: string; nickname: string; total_score: number }>) => {
    if (!state.session) {
      throw new Error('No active session');
    }

    try {
      const nostrService = getNostrWebSocketService();
      
      // Create score update event
      const event = {
        kind: 35004,
        content: JSON.stringify({
          session_id: state.session.id,
          question_index: questionIndex,
          scores,
          created_at: Date.now()
        }),
        tags: [
          ['e', state.session.id],
          ['t', 'score_update']
        ]
      };

      await nostrService.publishEvent(event);
    } catch (error) {
      console.error('Error publishing score update:', error);
      throw error;
    }
  }, [state.session]);

  // Clean up subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionId) {
        const nostrService = getNostrWebSocketService();
        nostrService.unsubscribe(subscriptionId);
      }
    };
  }, [subscriptionId]);

  return {
    ...state,
    createSession,
    joinSession,
    submitAnswer,
    startGame,
    nextQuestion,
    showResults,
    endGame,
    publishScoreUpdate
  };
}