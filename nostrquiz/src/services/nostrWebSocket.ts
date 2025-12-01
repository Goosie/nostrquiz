// WebSocket-based Nostr service without SimplePool
import { Event, Filter, getEventHash, getPublicKey, nip19, generateSecretKey, getSignature, finalizeEvent } from 'nostr-tools';

interface RelayConnection {
  url: string;
  ws: WebSocket | null;
  connected: boolean;
  subscriptions: Map<string, Filter[]>;
}

export class NostrWebSocketService {
  private relays: Map<string, RelayConnection>;
  private eventCallbacks: Map<string, (event: Event) => void>;
  private connectionCallbacks: Set<(connected: boolean) => void>;

  constructor(relayUrls: string[] = ['wss://relay.damus.io', 'wss://nos.lol']) {
    this.relays = new Map();
    this.eventCallbacks = new Map();
    this.connectionCallbacks = new Set();

    // Initialize relay connections
    relayUrls.forEach(url => {
      this.relays.set(url, {
        url,
        ws: null,
        connected: false,
        subscriptions: new Map()
      });
    });

    console.log('NostrWebSocketService created with relays:', relayUrls);
  }

  async connect(): Promise<void> {
    console.log('Connecting to Nostr relays...');
    
    const connectionPromises = Array.from(this.relays.keys()).map(url => 
      this.connectToRelay(url)
    );

    await Promise.allSettled(connectionPromises);
    this.notifyConnectionChange();
  }

  private async connectToRelay(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const relay = this.relays.get(url);
      if (!relay) {
        reject(new Error(`Relay ${url} not found`));
        return;
      }

      try {
        const ws = new WebSocket(url);
        relay.ws = ws;

        ws.onopen = () => {
          console.log(`Connected to relay: ${url}`);
          relay.connected = true;
          resolve();
        };

        ws.onclose = () => {
          console.log(`Disconnected from relay: ${url}`);
          relay.connected = false;
          relay.ws = null;
          this.notifyConnectionChange();
        };

        ws.onerror = (error) => {
          console.error(`Error connecting to relay ${url}:`, error);
          relay.connected = false;
          relay.ws = null;
          reject(error);
        };

        ws.onmessage = (message) => {
          this.handleRelayMessage(url, message.data);
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!relay.connected) {
            ws.close();
            reject(new Error(`Connection timeout for ${url}`));
          }
        }, 5000);

      } catch (error) {
        console.error(`Failed to connect to relay ${url}:`, error);
        reject(error);
      }
    });
  }

  private handleRelayMessage(relayUrl: string, data: string): void {
    try {
      const message = JSON.parse(data);
      const [type, subscriptionId, event] = message;

      if (type === 'EVENT' && event) {
        // Call registered event callbacks
        this.eventCallbacks.forEach(callback => {
          try {
            callback(event);
          } catch (error) {
            console.error('Error in event callback:', error);
          }
        });
      }
    } catch (error) {
      console.error(`Error parsing message from ${relayUrl}:`, error);
    }
  }

  private notifyConnectionChange(): void {
    const connected = this.isConnected();
    this.connectionCallbacks.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from all relays...');
    
    this.relays.forEach(relay => {
      if (relay.ws) {
        relay.ws.close();
        relay.ws = null;
        relay.connected = false;
      }
    });

    this.notifyConnectionChange();
  }

  isConnected(): boolean {
    return Array.from(this.relays.values()).some(relay => relay.connected);
  }

  getConnectedRelays(): string[] {
    return Array.from(this.relays.entries())
      .filter(([_, relay]) => relay.connected)
      .map(([url, _]) => url);
  }

  async getPublicKey(): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      return await (window as any).nostr.getPublicKey();
    }
    throw new Error('No Nostr extension found');
  }

  hasNostrExtension(): boolean {
    return typeof window !== 'undefined' && !!(window as any).nostr;
  }

  generateEphemeralKeypair(): { privateKey: Uint8Array; publicKey: string; npub: string } {
    const privateKey = generateSecretKey();
    const publicKey = getPublicKey(privateKey);
    const npub = nip19.npubEncode(publicKey);
    
    return { privateKey, publicKey, npub };
  }

  async publishEvent(event: Partial<Event>, privateKey?: Uint8Array): Promise<string> {
    if (!this.isConnected()) {
      throw new Error('Not connected to any relays');
    }

    let finalEvent: Event;

    if (privateKey) {
      // Sign with provided private key
      const publicKey = getPublicKey(privateKey);
      finalEvent = finalizeEvent({
        ...event,
        pubkey: publicKey,
        created_at: Math.floor(Date.now() / 1000)
      } as Event, privateKey);
    } else {
      // Sign with browser extension
      if (!this.hasNostrExtension()) {
        throw new Error('No private key provided and no Nostr extension found');
      }
      
      const unsignedEvent = {
        ...event,
        pubkey: await this.getPublicKey(),
        created_at: Math.floor(Date.now() / 1000)
      };

      finalEvent = await (window as any).nostr.signEvent(unsignedEvent);
    }

    // Publish to all connected relays
    const publishPromises = this.getConnectedRelays().map(url => {
      const relay = this.relays.get(url);
      if (relay?.ws && relay.connected) {
        const message = JSON.stringify(['EVENT', finalEvent]);
        relay.ws.send(message);
        return Promise.resolve();
      }
      return Promise.reject(new Error(`Relay ${url} not connected`));
    });

    await Promise.allSettled(publishPromises);
    return finalEvent.id;
  }

  subscribe(filters: Filter[], callback: (event: Event) => void): string {
    const subscriptionId = Math.random().toString(36).substring(2);
    
    // Register callback
    this.eventCallbacks.set(subscriptionId, callback);

    // Send subscription to all connected relays
    this.getConnectedRelays().forEach(url => {
      const relay = this.relays.get(url);
      if (relay?.ws && relay.connected) {
        const message = JSON.stringify(['REQ', subscriptionId, ...filters]);
        relay.ws.send(message);
        relay.subscriptions.set(subscriptionId, filters);
      }
    });

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    // Remove callback
    this.eventCallbacks.delete(subscriptionId);

    // Send unsubscribe to all relays
    this.getConnectedRelays().forEach(url => {
      const relay = this.relays.get(url);
      if (relay?.ws && relay.connected) {
        const message = JSON.stringify(['CLOSE', subscriptionId]);
        relay.ws.send(message);
        relay.subscriptions.delete(subscriptionId);
      }
    });
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  // Game-specific methods
  async createGameSession(quizId: string, pin: string, settings: any, privateKey?: Uint8Array): Promise<string> {
    const event = {
      kind: 35001,
      content: JSON.stringify({
        quiz_id: quizId,
        pin,
        settings,
        created_at: Date.now()
      }),
      tags: [
        ['d', `session_${pin}`],
        ['quiz', quizId]
      ]
    };

    return await this.publishEvent(event, privateKey);
  }

  async joinGameSession(sessionId: string, nickname: string, privateKey?: Uint8Array): Promise<string> {
    const event = {
      kind: 35002,
      content: JSON.stringify({
        session_id: sessionId,
        nickname,
        joined_at: Date.now()
      }),
      tags: [
        ['e', sessionId],
        ['t', 'join']
      ]
    };

    return await this.publishEvent(event, privateKey);
  }

  async submitAnswer(sessionId: string, questionIndex: number, answerIndex: number, timeMs: number, privateKey?: Uint8Array): Promise<string> {
    const event = {
      kind: 35003,
      content: JSON.stringify({
        session_id: sessionId,
        question_index: questionIndex,
        answer_index: answerIndex,
        time_ms: timeMs,
        submitted_at: Date.now()
      }),
      tags: [
        ['e', sessionId],
        ['t', 'answer']
      ]
    };

    return await this.publishEvent(event, privateKey);
  }

  subscribeToGameSession(sessionId: string, callback: (event: Event) => void): string {
    const filters: Filter[] = [
      {
        kinds: [35001, 35002, 35003, 35004],
        '#e': [sessionId],
        since: Math.floor(Date.now() / 1000) - 3600 // Last hour
      }
    ];

    return this.subscribe(filters, callback);
  }

  findGameSessionByPin(pin: string, callback: (event: Event) => void): string {
    const filters: Filter[] = [
      {
        kinds: [35001],
        '#d': [`session_${pin}`],
        since: Math.floor(Date.now() / 1000) - 3600 // Last hour
      }
    ];

    return this.subscribe(filters, callback);
  }
}

// Lazy singleton instance
let _nostrService: NostrWebSocketService | null = null;

export function getNostrWebSocketService(): NostrWebSocketService {
  if (!_nostrService) {
    _nostrService = new NostrWebSocketService();
  }
  return _nostrService;
}