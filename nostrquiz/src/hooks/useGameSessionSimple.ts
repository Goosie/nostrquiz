import { useState } from 'react';

export function useGameSessionSimple() {
  const [session] = useState(null);
  const [players] = useState([]);
  const [gameState] = useState('waiting');

  const createSession = async () => {
    console.log('Create session called');
  };

  const startGame = async () => {
    console.log('Start game called');
  };

  return {
    session,
    players,
    gameState,
    createSession,
    startGame
  };
}