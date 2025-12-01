import { useState, useEffect, useCallback } from 'react';
import { getNostrWebSocketService } from '../services/nostrWebSocket';

export interface NostrState {
  connected: boolean;
  publicKey: string | null;
  connecting: boolean;
  error: string | null;
}

export function useNostr() {
  const [state, setState] = useState<NostrState>({
    connected: false,
    publicKey: null,
    connecting: false,
    error: null
  });

  const connect = useCallback(async () => {
    setState(prev => ({ ...prev, connecting: true, error: null }));
    
    try {
      const nostrService = getNostrWebSocketService();
      await nostrService.connect();
      const publicKey = await nostrService.getPublicKey();
      
      setState({
        connected: true,
        publicKey,
        connecting: false,
        error: null
      });
    } catch (error) {
      setState({
        connected: false,
        publicKey: null,
        connecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Nostr'
      });
    }
  }, []);

  const disconnect = useCallback(async () => {
    try {
      const nostrService = getNostrWebSocketService();
      await nostrService.disconnect();
      setState({
        connected: false,
        publicKey: null,
        connecting: false,
        error: null
      });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, []);

  // Check if extension is available
  const checkExtension = useCallback(() => {
    return typeof window !== 'undefined' && !!(window as any).nostr;
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (state.connected) {
        const nostrService = getNostrWebSocketService();
        nostrService.disconnect();
      }
    };
  }, [state.connected]);

  return {
    ...state,
    connect,
    disconnect,
    hasExtension: checkExtension()
  };
}