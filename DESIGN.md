# NostrQuiz Data Structures Design

## Internal Quiz Object

```typescript
interface Quiz {
  id: string;                    // Quiz identifier
  title: string;                 // Quiz title
  description?: string;          // Quiz description
  language?: string;             // ISO language code
  formstrEventId?: string;       // Reference to original Formstr event
  questions: QuizQuestion[];     // Array of questions
  settings: QuizSettings;        // Quiz-level settings
}

interface QuizQuestion {
  id: string;                    // Unique question identifier
  text: string;                  // Question text
  type: 'multiple_choice' | 'true_false';
  options: string[];             // Answer options (max 4 for MC, ignored for T/F)
  correctIndex: number;          // Index of correct answer (0 for True, 1 for False)
  timeLimitSeconds: number;      // Time limit (default: 20)
  points: number;                // Points awarded (default: 1000)
}

interface QuizSettings {
  defaultTimeLimit: number;      // Default time per question
  defaultPoints: number;         // Default points per question
  allowAnonymous: boolean;       // Allow anonymous players
}
```

## Formstr to Quiz Mapping

### Quiz Template Convention in Formstr

To create a quiz in Formstr, use this structure:

1. **Quiz Metadata Fields**:
   - `title` (shortText): Quiz title
   - `description` (paragraph): Quiz description  
   - `language` (shortText): Language code (optional)

2. **Question Fields**:
   - Use `radioButton` or `checkboxes` for multiple choice
   - Use special naming convention: "Q1: What is 2+2?" 
   - First choice is always the correct answer
   - Randomize choice order in NostrQuiz display

3. **Settings Fields** (optional):
   - `time_limit` (number): Default time limit in seconds
   - `points` (number): Default points per question

### Mapping Logic

```typescript
function mapFormstrToQuiz(formSpec: V1FormSpec): Quiz {
  // Extract metadata fields
  const titleField = formSpec.fields?.find(f => f.question.toLowerCase().includes('title'));
  const descField = formSpec.fields?.find(f => f.question.toLowerCase().includes('description'));
  
  // Extract question fields (those with choices)
  const questionFields = formSpec.fields?.filter(f => 
    f.answerSettings.choices && f.answerSettings.choices.length > 1
  ) || [];
  
  // Map to internal format
  const questions: QuizQuestion[] = questionFields.map((field, index) => ({
    id: field.questionId,
    text: field.question,
    type: field.answerSettings.choices!.length === 2 ? 'true_false' : 'multiple_choice',
    options: field.answerSettings.choices!.map(c => c.label),
    correctIndex: 0, // First choice is correct by convention
    timeLimitSeconds: 20,
    points: 1000
  }));
  
  return {
    id: generateQuizId(),
    title: titleField?.question || formSpec.name,
    description: descField?.question,
    questions,
    settings: {
      defaultTimeLimit: 20,
      defaultPoints: 1000,
      allowAnonymous: true
    }
  };
}
```

## Nostr Event Schemas

### 1. Quiz Definition (Kind 35000)
```typescript
interface QuizDefinitionEvent {
  kind: 35000;
  content: string; // JSON.stringify(Quiz)
  tags: [
    ["d", quiz_id],              // Deterministic ID
    ["formstr", formstr_event_id], // Reference to Formstr event
    ["title", quiz_title],       // Searchable title
    ["lang", language_code]      // Language (optional)
  ];
}
```

### 2. Game Session (Kind 35001)
```typescript
interface GameSessionEvent {
  kind: 35001;
  content: string; // JSON.stringify(GameSessionData)
  tags: [
    ["h", host_pubkey],          // Host public key
    ["quiz", quiz_id],           // Quiz reference
    ["pin", game_pin],           // 6-digit PIN
    ["status", "lobby|active|ended"] // Session status
  ];
}

interface GameSessionData {
  quizId: string;
  pin: string;
  settings: {
    timePerQuestion: number;
    pointsMode: 'standard' | 'speed_bonus';
    maxPlayers?: number;
  };
  currentQuestion?: number;      // Current question index
  startedAt?: number;           // Timestamp when game started
}
```

### 3. Player Join (Kind 35002)
```typescript
interface PlayerJoinEvent {
  kind: 35002;
  content: string; // JSON.stringify(PlayerJoinData)
  tags: [
    ["e", session_event_id],     // Reference to game session
    ["p", player_pubkey],        // Player public key (or ephemeral)
    ["pin", game_pin]            // Game PIN for filtering
  ];
}

interface PlayerJoinData {
  sessionId: string;
  nickname: string;
  isAnonymous: boolean;
  joinedAt: number;             // Timestamp
}
```

### 4. Answer (Kind 35003)
```typescript
interface AnswerEvent {
  kind: 35003;
  content: string; // JSON.stringify(AnswerData)
  tags: [
    ["e", session_event_id],     // Reference to game session
    ["p", player_pubkey],        // Player public key
    ["q", question_index]        // Question index
  ];
}

interface AnswerData {
  sessionId: string;
  questionIndex: number;
  answerIndex: number;          // Selected answer index
  timeMs: number;               // Time taken to answer (ms)
  submittedAt: number;          // Timestamp
}
```

### 5. Score Update (Kind 35004)
```typescript
interface ScoreUpdateEvent {
  kind: 35004;
  content: string; // JSON.stringify(ScoreUpdateData)
  tags: [
    ["e", session_event_id],     // Reference to game session
    ["q", question_index]        // Question index
  ];
}

interface ScoreUpdateData {
  sessionId: string;
  questionIndex: number;
  scores: PlayerScore[];
  correctAnswer: number;        // Correct answer index
  questionStats: {
    totalAnswers: number;
    correctAnswers: number;
    averageTime: number;
  };
}

interface PlayerScore {
  playerPubkey: string;
  nickname: string;
  totalScore: number;
  questionScore: number;        // Points for this question
  isCorrect: boolean;
  timeMs: number;
  rank: number;                 // Current ranking
}
```

## Game State Management

### Host State
```typescript
interface HostGameState {
  quiz: Quiz;
  session: GameSessionData;
  players: Map<string, PlayerInfo>;
  currentQuestion: number;
  questionStartTime: number;
  answers: Map<string, AnswerData>; // playerPubkey -> answer
  scores: Map<string, number>;      // playerPubkey -> total score
  gameStatus: 'lobby' | 'question' | 'results' | 'ended';
}

interface PlayerInfo {
  pubkey: string;
  nickname: string;
  isAnonymous: boolean;
  joinedAt: number;
  isConnected: boolean;
}
```

### Player State
```typescript
interface PlayerGameState {
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
```

## Relay Configuration

```typescript
interface RelayConfig {
  defaultRelays: string[];
  customRelays?: string[];
  writeRelays?: string[];       // Specific relays for publishing
  readRelays?: string[];        // Specific relays for subscribing
}

const DEFAULT_RELAYS = [
  'wss://relay.damus.io/',
  'wss://relay.primal.net/',
  'wss://nos.lol',
  'wss://relay.nostr.wirednet.jp/',
  'wss://relay.snort.social'
];
```

## Error Handling

```typescript
interface NostrQuizError {
  code: string;
  message: string;
  context?: any;
}

enum ErrorCodes {
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
```

This design provides a solid foundation for the NostrQuiz platform with clear data structures, Nostr event schemas, and state management patterns.