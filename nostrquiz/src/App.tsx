
import { Routes, Route } from 'react-router-dom'
import { ROUTES } from './utils/constants'
import HomePage from './pages/HomePage'
import HostPageReal from './pages/HostPageReal'
import JoinPage from './pages/JoinPage'
import PlayerPageReal from './pages/PlayerPageReal'

function App() {
  console.log('App component rendering...');
  console.log('Current pathname:', window.location.pathname);
  console.log('Current search:', window.location.search);
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0E0F19', 
      color: '#FFFFFF',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>NostrQuiz - Release 2 (Real-time)</h1>
      <p>Current path: {window.location.pathname}</p>
      <p>Debug: Real Nostr integration active</p>
      
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.HOST} element={<HostPageReal />} />
        <Route path={ROUTES.JOIN} element={<JoinPage />} />
        <Route path={ROUTES.PLAYER_GAME} element={
          <div>
            <h2>🎮 Player Game Route Reached!</h2>
            <p>URL: {window.location.href}</p>
            <PlayerPageReal />
          </div>
        } />
      </Routes>
    </div>
  )
}

export default App