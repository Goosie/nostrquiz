import { 
  SimplePool, 
  Event, 
  getEventHash, 
  getPublicKey,
  nip19,
  Filter,
  generateSecretKey,
  getSignature
} from 'nostr-tools';
import { DEFAULT_RELAYS } from '../utils/constants';
import { 
  NostrEvent, 
  GameSession, 
  PlayerJoin, 
  Answer, 
  ScoreUpdate,
  QuizDefinition 
} from '../types';

export class NostrService {
  private pool: SimplePool;
  private relays: string[];
  private subscriptions: Map<string, any> = new Map();

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.pool = new SimplePool();
    this.relays = relays;
  }

  // Connect to relays
  async connect(): Promise<void> {
    try {
      // Check if NIP-07 extension is available
      if (typeof window !== 'undefined' && (window as any).nostr) {
        console.log('Nostr extension detected');
      } else {
        throw new Error('Nostr extension not found. Please install a Nostr browser extension like Alby or nos2x.');
      }
    } catch (error) {
      console.error('Failed to connect to Nostr:', error);
      throw error;
    }
  }

  // Get public key from NIP-07 extension
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

  // Disconnect from relays
  async disconnect(): Promise<void> {
    this.pool.close(this.relays);
    this.subscriptions.clear();
  }

  // Sign event using NIP-07 extension
  async signEvent(event: Partial<Event>): Promise<Event> {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      try {
        return await (window as any).nostr.signEvent(event);
      } catch (error) {
        console.error('Failed to sign event:', error);
        throw new Error('Failed to sign event');
      }
    }
    throw new Error('Nostr extension not available');
  }

  // Publish event to relays
  async publishEvent(event: Event): Promise<void> {
    try {
      await Promise.any(
        this.pool.publish(this.relays, event)
      );
      console.log('Event published successfully');
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw new Error('Failed to publish event to relays');
    }
  }

  // Subscribe to events
  subscribe(filters: Filter[], onEvent: (event: Event) => void): string {
    const subId = Math.random().toString(36).substring(7);
    
    const sub = this.pool.subscribeMany(
      this.relays,
      filters,
      {
        onevent: onEvent,
        oneose: () => {
          console.log('Subscription ended:', subId);
        }
      }
    );

    this.subscriptions.set(subId, sub);
    return subId;
  }

  // Unsubscribe from events
  unsubscribe(subId: string): void {
    const sub = this.subscriptions.get(subId);
    if (sub) {
      sub.close();
      this.subscriptions.delete(subId);
    }
  }

  // Create quiz definition event
  async createQuizDefinition(quiz: QuizDefinition): Promise<Event> {
    const event: Partial<Event> = {
      kind: 35000,
      content: JSON.stringify(quiz),
      tags: [
        ['d', quiz.id],
        ...(quiz.formstrEventId ? [['formstr', quiz.formstrEventId]] : [])
      ],
      created_at: Math.floor(Date.now() / 1000)
    };

    return await this.signEvent(event);
  }

  // Create game session event
  async createGameSession(session: GameSession): Promise<Event> {
    const event: Partial<Event> = {
      kind: 35001,
      content: JSON.stringify(session),
      tags: [
        ['h', session.hostPubkey]
      ],
      created_at: Math.floor(Date.now() / 1000)
    };

    return await this.signEvent(event);
  }

  // Create player join event
  async createPlayerJoin(playerJoin: PlayerJoin): Promise<Event> {
    const event: Partial<Event> = {
      kind: 35002,
      content: JSON.stringify(playerJoin),
      tags: [
        ['p', playerJoin.playerPubkey],
        ['e', playerJoin.sessionId]
      ],
      created_at: Math.floor(Date.now() / 1000)
    };

    return await this.signEvent(event);
  }

  // Create answer event
  async createAnswer(answer: Answer): Promise<Event> {
    const event: Partial<Event> = {
      kind: 35003,
      content: JSON.stringify(answer),
      tags: [
        ['p', answer.playerPubkey],
        ['e', answer.sessionId]
      ],
      created_at: Math.floor(Date.now() / 1000)
    };

    return await this.signEvent(event);
  }

  // Create score update event
  async createScoreUpdate(scoreUpdate: ScoreUpdate): Promise<Event> {
    const event: Partial<Event> = {
      kind: 35004,
      content: JSON.stringify(scoreUpdate),
      tags: [
        ['e', scoreUpdate.sessionId]
      ],
      created_at: Math.floor(Date.now() / 1000)
    };

    return await this.signEvent(event);
  }

  // Find game session by PIN
  async findSessionByPin(pin: string): Promise<Event | null> {
    return new Promise((resolve) => {
      let found = false;
      
      const sub = this.pool.subscribeMany(
        this.relays,
        [{ kinds: [35001], limit: 100 }],
        {
          onevent: (event: Event) => {
            try {
              const session = JSON.parse(event.content) as GameSession;
              if (session.pin === pin && !found) {
                found = true;
                sub.close();
                resolve(event);
              }
            } catch (error) {
              console.error('Error parsing session event:', error);
            }
          },
          oneose: () => {
            if (!found) {
              sub.close();
              resolve(null);
            }
          }
        }
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!found) {
          sub.close();
          resolve(null);
        }
      }, 5000);
    });
  }
}

export const nostrService = new NostrService();