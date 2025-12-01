
import { Routes, Route } from 'react-router-dom'
import { ROUTES } from './utils/constants'
import HomePage from './pages/HomePage'
import { HostPageFull } from './pages/HostPageFull'
import JoinPage from './pages/JoinPage'
import PlayerGamePage from './pages/PlayerGamePage'

function App() {
  console.log('App component rendering...');
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0E0F19', 
      color: '#FFFFFF',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>NostrQuiz - Test with Routing</h1>
      <p>Current path: {window.location.pathname}</p>
      <p>Debug: Routes are working</p>
      
      <Routes>
        <Route path={ROUTES.HOME} element={<HomePage />} />
        <Route path={ROUTES.HOST} element={<HostPageFull />} />
        <Route path={ROUTES.JOIN} element={<JoinPage />} />
        <Route path={ROUTES.PLAYER_GAME} element={<PlayerGamePage />} />
      </Routes>
    </div>
  )
}

export default App