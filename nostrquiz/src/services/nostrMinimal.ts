// Minimal working version to test imports
import { SimplePool, Event, Filter, getEventHash, getPublicKey, nip19, generateSecretKey, getSignature } from 'nostr-tools';

export class NostrServiceMinimal {
  private pool: SimplePool;

  constructor() {
    this.pool = new SimplePool();
    console.log('NostrServiceMinimal created with pool:', !!this.pool);
  }

  async connect(): Promise<void> {
    console.log('Connect called');
    // Check if NIP-07 extension is available
    if (typeof window !== 'undefined' && (window as any).nostr) {
      console.log('Nostr extension detected');
    } else {
      throw new Error('Nostr extension not found. Please install a Nostr browser extension like Alby or nos2x.');
    }
  }

  async getPublicKey(): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      try {
        return await (window as any).nostr.getPublicKey();
      } catch (error) {
        console.error('Failed to get public key:', error);
        throw new Error('Failed to get public key from Nostr extension');
      }
    }
    throw new Error('Nostr extension not available');
  }

  async disconnect(): Promise<void> {
    console.log('Disconnect called');
  }
}

export const nostrServiceMinimal = new NostrServiceMinimal();