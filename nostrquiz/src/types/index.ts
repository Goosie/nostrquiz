// Core Quiz Types
export interface Quiz {
  id: string;
  title: string;
  description?: string;
  language?: string;
  formstr_event_id?: string; // Keep snake_case for Nostr compatibility
  questions: QuizQuestion[];
  settings?: QuizSettings;
  created_at?: number; // Keep snake_case for Nostr compatibility
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false';
  options: string[];
  correct_index: number; // Keep snake_case for Nostr compatibility
  time_limit_seconds: number; // Keep snake_case for Nostr compatibility
  points: number;
}

export interface QuizSettings {
  defaultTimeLimit: number;
  defaultPoints: number;
  allowAnonymous: boolean;
}

// Game Session Types
export interface GameSession {
  id: string;
  quiz_id: string; // Keep snake_case for Nostr compatibility
  pin: string;
  host_pubkey: string; // Keep snake_case for Nostr compatibility
  settings: GameSessionSettings;
  created_at: number; // Keep snake_case for Nostr compatibility
}

export interface GameSessionSettings {
  time_per_question: number; // Keep snake_case for Nostr compatibility
  points_mode: 'standard' | 'speed_bonus'; // Keep snake_case for Nostr compatibility
}

// Player Types
export interface Player {
  pubkey: string;
  nickname: string;
  score: number;
  connected: boolean; // Use connected instead of isConnected for consistency
}

export interface PlayerScore {
  playerPubkey: string;
  nickname: string;
  totalScore: number;
  questionScore: number;
  isCorrect: boolean;
  timeMs: number;
  rank: number;
}

// Answer Types
export interface Answer {
  session_id: string; // Keep snake_case for Nostr compatibility
  session_event_id: string; // Keep snake_case for Nostr compatibility
  player_pubkey: string; // Keep snake_case for Nostr compatibility
  question_index: number; // Keep snake_case for Nostr compatibility
  answer_index: number; // Keep snake_case for Nostr compatibility
  time_ms?: number; // Keep snake_case for Nostr compatibility
  created_at: number; // Keep snake_case for Nostr compatibility
}

// Nostr Event Types
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

// Game State Types
export interface HostGameState {
  quiz: Quiz;
  session: GameSession;
  players: Map<string, Player>;
  currentQuestion: number;
  questionStartTime: number;
  answers: Map<string, Answer>;
  scores: Map<string, number>;
  gameStatus: 'lobby' | 'question' | 'results' | 'ended';
}

export interface PlayerGameState {
  sessionId: string;
  nickname: string;
  currentQuestion?: QuizQuestion;
  questionIndex: number;
  timeRemaining: number;
  hasAnswered: boolean;
  selectedAnswer?: number;
  score: number;
  rank?: number;
  gameStatus: 'joining' | 'waiting' | 'question' | 'results' | 'ended';
}

// Error Types
export interface NostrQuizError {
  code: string;
  message: string;
  context?: any;
}

export enum ErrorCodes {
  QUIZ_NOT_FOUND = 'QUIZ_NOT_FOUND',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  INVALID_PIN = 'INVALID_PIN',
  GAME_FULL = 'GAME_FULL',
  GAME_ENDED = 'GAME_ENDED',
  DUPLICATE_ANSWER = 'DUPLICATE_ANSWER',
  TIME_EXPIRED = 'TIME_EXPIRED',
  RELAY_ERROR = 'RELAY_ERROR',
  AUTH_ERROR = 'AUTH_ERROR'
}

// Formstr Integration Types
export interface FormstrField {
  question: string;
  questionId: string;
  answerType: string;
  answerSettings: {
    choices?: Array<{
      choiceId: string;
      label: string;
      isOther?: boolean;
    }>;
    required?: boolean;
  };
}

export interface FormstrSpec {
  schemaVersion: string;
  name: string;
  fields?: FormstrField[];
  settings?: {
    titleImageUrl?: string;
    description?: string;
    publicForm?: boolean;
  };
}

// Additional Nostr event types
export interface PlayerJoin {
  session_id: string; // Keep snake_case for Nostr compatibility
  session_event_id: string; // Keep snake_case for Nostr compatibility
  player_pubkey: string; // Keep snake_case for Nostr compatibility
  nickname: string;
  created_at: number; // Keep snake_case for Nostr compatibility
}

export interface ScoreUpdate {
  session_id: string; // Keep snake_case for Nostr compatibility
  session_event_id: string; // Keep snake_case for Nostr compatibility
  question_index: number; // Keep snake_case for Nostr compatibility
  scores: Array<{
    player_pubkey: string; // Keep snake_case for Nostr compatibility
    nickname: string;
    total_score: number; // Keep snake_case for Nostr compatibility
  }>;
  created_at: number; // Keep snake_case for Nostr compatibility
}

export interface QuizDefinition {
  id: string;
  title: string;
  description?: string;
  language: string;
  questions: Array<{
    id: string;
    text: string;
    type: 'multiple_choice' | 'true_false';
    options: string[];
    correct_index: number; // Keep snake_case for Nostr compatibility
    time_limit_seconds: number; // Keep snake_case for Nostr compatibility
    points: number;
  }>;
  formstr_event_id?: string; // Keep snake_case for Nostr compatibility
  created_at: number; // Keep snake_case for Nostr compatibility
}

// Alias for QuizQuestion
export type Question = QuizQuestion;