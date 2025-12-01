# NostrQuiz

A Kahoot-style quiz platform powered by the Nostr protocol, with Formstr integration for quiz authoring.

## Features

- 🎯 **Host Quizzes**: Create and manage live quiz sessions
- 🎮 **Join Games**: Players join with a simple 6-digit PIN
- 📱 **Mobile-Friendly**: Optimized player interface for mobile devices
- 🏆 **Live Leaderboards**: Real-time scoring and rankings
- 🔗 **Nostr-Powered**: Decentralized communication via Nostr relays
- 📝 **Formstr Integration**: Create quizzes using Formstr forms

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Nostr browser extension (Alby, nos2x, etc.) for hosting quizzes

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Goosie/nostrquiz.git
cd nostrquiz
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser to `http://localhost:12000`

## How to Use

### For Quiz Hosts

1. **Connect Nostr Extension**: Click "Host a Quiz" and connect your Nostr browser extension
2. **Select Quiz**: Choose from your Formstr quizzes or use the demo quizzes
3. **Start Session**: Generate a game PIN and share it with players
4. **Manage Game**: Control question flow and view live results

### For Players

1. **Join Game**: Enter the 6-digit PIN provided by the host
2. **Enter Nickname**: Choose a display name (2-20 characters)
3. **Answer Questions**: Select answers within the time limit
4. **View Results**: See your score and ranking after each question

### Creating Quizzes with Formstr

1. Visit [Formstr.app](https://formstr.app)
2. Create a new form with the following structure:
   - **Quiz Title**: Form name
   - **Questions**: Use multiple choice or true/false fields
   - **Answer Options**: Add choices for multiple choice questions
3. Your quizzes will automatically appear in NostrQuiz when you connect with the same Nostr identity

## Demo Mode

The application includes demo quizzes for testing:
- General Knowledge Quiz (2 questions)
- Science Quiz (1 question)

## Development

### Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Route components
├── services/      # Nostr and Formstr integration
├── types/         # TypeScript type definitions
├── utils/         # Helper functions and constants
└── styles/        # Global CSS styles
```

### Key Technologies

- **React 18** with TypeScript
- **React Router** for navigation
- **Vite** for build tooling
- **nostr-tools** for Nostr protocol integration
- **CSS Custom Properties** for theming

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Configuration

### Relay Configuration

Default Nostr relays are configured in `src/utils/constants.ts`:
- wss://relay.damus.io/
- wss://relay.primal.net/
- wss://nos.lol
- wss://relay.nostr.wirednet.jp/
- wss://relay.snort.social
- wss://relay.nostr.band

### Theming

The application supports dark and light themes via CSS custom properties. Toggle themes by setting the `data-theme` attribute:

```javascript
document.documentElement.setAttribute('data-theme', 'light');
```

## Nostr Event Types

NostrQuiz uses the following custom event kinds:

- **35000**: Quiz Definition
- **35001**: Game Session
- **35002**: Player Join
- **35003**: Answer Submission
- **35004**: Score Update/Leaderboard

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

## Support

- Create an issue for bug reports or feature requests
- Join the discussion on Nostr (coming soon)
- Check the documentation for common questions