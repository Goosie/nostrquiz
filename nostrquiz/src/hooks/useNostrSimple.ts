import { useState } from 'react';

export interface NostrState {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  error: string | null;
}

export function useNostrSimple() {
  const [state] = useState<NostrState>({
    connected: false,
    publicKey: null,
    connecting: false,
    error: null
  });

  const connect = async () => {
    console.log('Connect called');
  };

  const hasExtension = false;

  return {
    ...state,
    connect,
    hasExtension
  };
}