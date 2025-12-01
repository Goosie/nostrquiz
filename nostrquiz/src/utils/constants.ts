// Nostr Event Kinds
export const NOSTR_KINDS = {
  QUIZ_DEFINITION: 35000,
  GAME_SESSION: 35001,
  PLAYER_JOIN: 35002,
  ANSWER: 35003,
  SCORE_UPDATE: 35004,
} as const;

// Default Relay Configuration
export const DEFAULT_RELAYS = [
  'wss://relay.damus.io/',
  'wss://relay.primal.net/',
  'wss://nos.lol',
  'wss://relay.nostr.wirednet.jp/',
  'wss://relay.snort.social',
  'wss://relay.nostr.band',
];

// Game Configuration
export const GAME_CONFIG = {
  DEFAULT_TIME_LIMIT: 20, // seconds
  DEFAULT_POINTS: 1000,
  MAX_PLAYERS: 100,
  PIN_LENGTH: 6,
  SPEED_BONUS_MULTIPLIER: 1.5,
  MIN_ANSWER_TIME: 1, // minimum seconds to answer
} as const;

// UI Configuration
export const UI_CONFIG = {
  QUESTION_TRANSITION_DELAY: 2000, // ms
  SCORE_DISPLAY_DELAY: 3000, // ms
  COUNTDOWN_INTERVAL: 100, // ms
  LEADERBOARD_UPDATE_INTERVAL: 1000, // ms
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  HOST: '/host',
  HOST_LOBBY: '/host/lobby',
  HOST_GAME: '/host/game',
  HOST_RESULTS: '/host/results',
  JOIN: '/join',
  PLAYER_GAME: '/player/game',
  PLAYER_RESULTS: '/player/results',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  RELAY_CONFIG: 'nostrquiz_relays',
  USER_PREFERENCES: 'nostrquiz_preferences',
  GAME_SESSION: 'nostrquiz_session',
  PLAYER_DATA: 'nostrquiz_player',
} as const;