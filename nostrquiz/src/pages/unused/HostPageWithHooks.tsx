import React from 'react';
import { Link } from 'react-router-dom';
import { useNostr } from '../hooks/useNostr';
// import { useGameSessionSimple } from '../hooks/useGameSessionSimple';

const HostPageWithHooks: React.FC = () => {
  const { connected, publicKey, connecting, error, connect, hasExtension } = useNostr();
  // const { session, players, gameState, createSession, startGame } = useGameSessionSimple();
  // const [selectedQuiz, setSelectedQuiz] = useState(null);

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0E0F19', 
      color: '#FFFFFF',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>Host Page - With Simple Hooks</h1>
      <p>Connected: {connected ? 'Yes' : 'No'}</p>
      <p>Public Key: {publicKey || 'None'}</p>
      <p>Connecting: {connecting ? 'Yes' : 'No'}</p>
      <p>Error: {error || 'None'}</p>
      <p>Has Extension: {hasExtension ? 'Yes' : 'No'}</p>
      
      <button 
        onClick={connect}
        style={{
          background: '#5B2DEE',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          margin: '10px'
        }}
      >
        Connect
      </button>

      <button 
        onClick={() => console.log('Create Session')}
        style={{
          background: '#2EA3FF',
          color: 'white',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          margin: '10px'
        }}
      >
        Create Session
      </button>

      <Link to="/" style={{ color: '#24E1FF', display: 'block', marginTop: '20px' }}>
        ← Back to Home
      </Link>
    </div>
  );
};

export default HostPageWithHooks;