# NostrQuiz Release 2 - Real-time Multiplayer Testing Instructions

## 🎯 Release 2 Features

Release 2 implements **real-time multiplayer quiz gameplay** using the Nostr protocol:

- **Real Nostr Integration**: WebSocket connections to Nostr relays
- **Live Game Sessions**: PIN-based joining with real-time synchronization  
- **Answer Submission**: Players submit answers via Nostr events
- **Live Leaderboard**: Real-time score updates and rankings
- **NIP-07 Authentication**: Browser extension wallet integration

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Modern web browser
- Nostr browser extension (optional, for host authentication)

### Setup
```bash
git clone https://github.com/Goosie/nostrquiz.git
cd nostrquiz
npm install
npm run dev
```

The application will start at `http://localhost:12000`

## 🧪 Testing Scenarios

### Scenario 1: Basic Host Setup
**Objective**: Test host quiz creation and lobby setup

1. **Open Host Page**
   - Navigate to `http://localhost:12000`
   - Click "Host a Quiz" button

2. **Connect to Nostr**
   - Click "Connect to Nostr" button
   - If you have a Nostr extension: Authorize the connection
   - If no extension: App will use demo mode with generated keys

3. **Select Quiz**
   - Choose from available demo quizzes:
     - "JavaScript Basics" (5 questions)
     - "React Fundamentals" (4 questions) 
     - "Nostr Protocol" (3 questions)
   - Click "Select Quiz" button

4. **Create Game Session**
   - Click "Start Game Session" button
   - Verify a 6-digit PIN is generated
   - Confirm lobby shows "Waiting for players..."

**Expected Results**:
- ✅ Nostr connection status shows "Connected"
- ✅ Quiz selection interface displays available quizzes
- ✅ Game PIN is generated (e.g., "123456")
- ✅ Lobby screen shows PIN and QR code
- ✅ Player count shows "0 players joined"

### Scenario 2: Player Joining
**Objective**: Test player joining via PIN

1. **Open Player Window**
   - Open new browser tab/window
   - Navigate to `http://localhost:12000/join`

2. **Join Game**
   - Enter the PIN from host lobby
   - Enter nickname (e.g., "TestPlayer1")
   - Click "Join Game" button

3. **Verify Connection**
   - Check player sees "Waiting for game to start..."
   - Check host lobby updates with new player
   - Verify player count increases

**Expected Results**:
- ✅ Player successfully joins with valid PIN
- ✅ Host lobby shows player nickname
- ✅ Player count updates (e.g., "1 player joined")
- ✅ Player sees waiting screen

### Scenario 3: Multiple Players
**Objective**: Test multiple players joining simultaneously

1. **Add More Players**
   - Open 2-3 additional browser tabs
   - Navigate each to `/join`
   - Use same PIN, different nicknames:
     - "Player2", "Player3", "Player4"

2. **Verify All Connections**
   - Host lobby shows all players
   - Each player sees waiting screen
   - Player count updates correctly

**Expected Results**:
- ✅ Multiple players can join with same PIN
- ✅ Host sees all player nicknames in lobby
- ✅ Player count accurate (e.g., "4 players joined")
- ✅ No duplicate or missing players

### Scenario 4: Quiz Gameplay
**Objective**: Test complete quiz flow with real-time updates

1. **Start Quiz** (Host)
   - Click "Start Quiz" button in lobby
   - Verify first question appears

2. **Answer Questions** (Players)
   - Each player sees question and answer options
   - Click different answers to test variety
   - Observe countdown timer

3. **Next Question** (Host)
   - After time expires, click "Next Question"
   - Verify leaderboard updates
   - Continue through all questions

4. **Complete Quiz**
   - Finish all questions
   - View final leaderboard
   - Check final rankings

**Expected Results**:
- ✅ Questions display correctly for all players
- ✅ Answer buttons work and show selection
- ✅ Countdown timer functions properly
- ✅ Leaderboard updates after each question
- ✅ Scores calculate correctly (faster = more points)
- ✅ Final rankings display properly

### Scenario 5: Real-time Synchronization
**Objective**: Test Nostr event synchronization

1. **Monitor Real-time Updates**
   - Host advances to next question
   - Verify all players see new question immediately
   - Submit answers at different times
   - Check leaderboard updates in real-time

2. **Test Edge Cases**
   - Player joins mid-game (should see current question)
   - Player refreshes browser (should reconnect)
   - Host refreshes (game state should persist)

**Expected Results**:
- ✅ Question changes sync across all clients
- ✅ Answer submissions appear in real-time
- ✅ Leaderboard updates immediately after each question
- ✅ Late joiners see current game state
- ✅ Browser refresh maintains connection

## 🔧 Troubleshooting

### Common Issues

**"Failed to connect to Nostr relays"**
- Check internet connection
- Verify relay URLs in console
- Try refreshing the page

**"Invalid PIN" error**
- Ensure PIN is exactly 6 digits
- Check host has created game session
- Verify PIN hasn't expired

**Players not appearing in lobby**
- Check browser console for errors
- Verify Nostr relay connections
- Try different browser/incognito mode

**Questions not updating**
- Check WebSocket connections in dev tools
- Verify host is clicking "Next Question"
- Refresh player browsers if needed

### Debug Information

Open browser Developer Tools (F12) to see:
- **Console**: Nostr connection status and errors
- **Network**: WebSocket connections to relays
- **Application**: Local storage for game state

## 🎮 Demo Quiz Content

### JavaScript Basics Quiz
1. What does `typeof null` return? (object)
2. Which method adds elements to array end? (push)
3. What is `this` in arrow functions? (lexical)
4. How to check if variable is array? (Array.isArray)
5. What does `===` operator do? (strict equality)

### React Fundamentals Quiz  
1. What creates React elements? (JSX)
2. How to manage component state? (useState)
3. When do effects run? (after render)
4. What are React keys for? (reconciliation)

### Nostr Protocol Quiz
1. What does NIP stand for? (Nostr Implementation Possibilities)
2. What are Nostr relays? (WebSocket servers)
3. How are users identified? (public keys)

## 📊 Success Criteria

Release 2 is successful when:

- ✅ Host can create game sessions with generated PINs
- ✅ Multiple players can join using PIN
- ✅ Real-time question display and answer submission works
- ✅ Leaderboard updates correctly after each question
- ✅ Complete quiz flow works end-to-end
- ✅ Nostr events are published and received properly
- ✅ Browser refresh doesn't break game state
- ✅ No critical errors in browser console

## 🚀 Next Steps

After successful testing:
1. Document any bugs or issues found
2. Test with real Nostr extensions (Alby, nos2x)
3. Try with external Nostr relays
4. Prepare for Release 3 features (see ROADMAP.md)

## 📞 Support

If you encounter issues:
1. Check browser console for errors
2. Verify network connectivity
3. Try incognito/private browsing mode
4. Report bugs with console logs and steps to reproduce