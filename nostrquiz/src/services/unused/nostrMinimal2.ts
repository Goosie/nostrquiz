// Minimal nostr service without SimplePool to test
import { Event, Filter, getEventHash, getPublicKey, nip19, generateSecretKey, getSignature } from 'nostr-tools';

export class NostrServiceMinimal {
  private relays: string[];

  constructor(relays: string[] = ['wss://relay.damus.io', 'wss://nos.lol']) {
    this.relays = relays;
    console.log('NostrServiceMinimal created with relays:', relays);
  }

  async connect(): Promise<void> {
    console.log('NostrServiceMinimal connect called');
  }

  async disconnect(): Promise<void> {
    console.log('NostrServiceMinimal disconnect called');
  }

  async getPublicKey(): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      return await (window as any).nostr.getPublicKey();
    }
    throw new Error('No Nostr extension found');
  }

  generateEphemeralKeypair(): { privateKey: string; publicKey: string; npub: string } {
    const privateKey = generateSecretKey();
    const publicKey = getPublicKey(privateKey);
    const npub = nip19.npubEncode(publicKey);
    
    return { privateKey, publicKey, npub };
  }
}

// Lazy singleton instance
let _nostrService: NostrServiceMinimal | null = null;

export function getNostrServiceMinimal(): NostrServiceMinimal {
  if (!_nostrService) {
    _nostrService = new NostrServiceMinimal();
  }
  return _nostrService;
}