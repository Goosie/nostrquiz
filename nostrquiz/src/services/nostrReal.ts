import { Event, Filter, finalizeEvent, generateSecretKey, getPublicKey } from 'nostr-tools';
import { Quiz } from '../types';

// Nostr event kinds for NostrQuiz
export const NOSTR_KINDS = {
  QUIZ_DEFINITION: 35000,
  GAME_SESSION: 35001,
  PLAYER_JOIN: 35002,
  ANSWER: 35003,
  SCORE_UPDATE: 35004,
  GAME_STATE: 35005, // For current question, game phase
} as const;

// Default relays for NostrQuiz
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nos.lol',
  'wss://relay.nostr.band',
  'wss://nostr-pub.wellorder.net',
];

export interface NostrConnection {
  url: string;
  ws: WebSocket | null;
  connected: boolean;
  reconnectAttempts: number;
}

export interface NostrServiceState {
  connections: Map<string, NostrConnection>;
  isConnected: boolean;
  userPubkey: string | null;
  subscriptions: Map<string, Filter[]>;
  eventHandlers: Map<number, ((event: Event) => void)[]>;
}

export class NostrRealService {
  private state: NostrServiceState;
  private privateKey: Uint8Array | null = null;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(relays: string[] = DEFAULT_RELAYS) {
    this.state = {
      connections: new Map(),
      isConnected: false,
      userPubkey: null,
      subscriptions: new Map(),
      eventHandlers: new Map(),
    };

    // Initialize relay connections
    relays.forEach(url => {
      this.state.connections.set(url, {
        url,
        ws: null,
        connected: false,
        reconnectAttempts: 0,
      });
    });
  }

  // Connect to Nostr relays
  async connect(): Promise<boolean> {
    console.log('🔌 Connecting to Nostr relays...');
    
    const connectionPromises = Array.from(this.state.connections.keys()).map(url => 
      this.connectToRelay(url)
    );

    const results = await Promise.allSettled(connectionPromises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;
    
    this.state.isConnected = successCount > 0;
    console.log(`✅ Connected to ${successCount}/${results.length} relays`);
    
    return this.state.isConnected;
  }

  // Connect to a single relay
  private async connectToRelay(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const connection = this.state.connections.get(url);
      if (!connection) {
        reject(new Error(`Connection not found for ${url}`));
        return;
      }

      try {
        const ws = new WebSocket(url);
        connection.ws = ws;

        ws.onopen = () => {
          console.log(`✅ Connected to ${url}`);
          connection.connected = true;
          connection.reconnectAttempts = 0;
          
          // Resubscribe to existing subscriptions
          this.resubscribeToRelay(url);
          resolve();
        };

        ws.onmessage = (event) => {
          this.handleMessage(url, event.data);
        };

        ws.onclose = () => {
          console.log(`❌ Disconnected from ${url}`);
          connection.connected = false;
          this.scheduleReconnect(url);
        };

        ws.onerror = (error) => {
          console.error(`❌ Error connecting to ${url}:`, error);
          connection.connected = false;
          reject(error);
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (!connection.connected) {
            ws.close();
            reject(new Error(`Timeout connecting to ${url}`));
          }
        }, 10000);

      } catch (error) {
        console.error(`❌ Failed to create WebSocket for ${url}:`, error);
        reject(error);
      }
    });
  }

  // Handle incoming messages from relays
  private handleMessage(relayUrl: string, data: string): void {
    try {
      const message = JSON.parse(data);
      const [type, ...rest] = message;

      switch (type) {
        case 'EVENT':
          const [, event] = rest;
          this.handleEvent(event);
          break;
        case 'EOSE':
          // End of stored events
          console.log(`📦 End of stored events from ${relayUrl}`);
          break;
        case 'NOTICE':
          console.log(`📢 Notice from ${relayUrl}:`, rest[0]);
          break;
        case 'OK':
          const [eventId, success, reason] = rest;
          if (success) {
            console.log(`✅ Event ${eventId} accepted by ${relayUrl}`);
          } else {
            console.error(`❌ Event ${eventId} rejected by ${relayUrl}:`, reason);
          }
          break;
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${relayUrl}:`, error);
    }
  }

  // Handle incoming events
  private handleEvent(event: Event): void {
    console.log(`📨 Received event kind ${event.kind}:`, event);
    console.log(`🏷️ Event tags:`, event.tags);
    
    const handlers = this.state.eventHandlers.get(event.kind) || [];
    console.log(`🔔 Found ${handlers.length} handlers for kind ${event.kind}`);
    
    handlers.forEach((handler, index) => {
      try {
        console.log(`🎯 Calling handler ${index} for kind ${event.kind}`);
        handler(event);
      } catch (error) {
        console.error(`❌ Error in event handler ${index} for kind ${event.kind}:`, error);
      }
    });
  }

  // Subscribe to events
  subscribe(subscriptionId: string, filters: Filter[]): void {
    console.log(`🔔 Subscribing to events:`, filters);
    
    this.state.subscriptions.set(subscriptionId, filters);
    
    const message = JSON.stringify(['REQ', subscriptionId, ...filters]);
    this.broadcastToRelays(message);
  }

  // Unsubscribe from events
  unsubscribe(subscriptionId: string): void {
    console.log(`🔕 Unsubscribing from ${subscriptionId}`);
    
    this.state.subscriptions.delete(subscriptionId);
    
    const message = JSON.stringify(['CLOSE', subscriptionId]);
    this.broadcastToRelays(message);
  }

  // Add event handler
  addEventListener(kind: number, handler: (event: Event) => void): void {
    if (!this.state.eventHandlers.has(kind)) {
      this.state.eventHandlers.set(kind, []);
    }
    this.state.eventHandlers.get(kind)!.push(handler);
  }

  // Remove event handler
  removeEventListener(kind: number, handler: (event: Event) => void): void {
    const handlers = this.state.eventHandlers.get(kind);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  // Publish event to relays
  async publishEvent(event: Partial<Event>): Promise<boolean> {
    if (!this.privateKey) {
      throw new Error('No private key available for signing');
    }

    // Complete the event using finalizeEvent
    const completeEvent = finalizeEvent({
      kind: event.kind!,
      tags: event.tags || [],
      content: event.content || '',
      created_at: Math.floor(Date.now() / 1000),
    }, this.privateKey);

    console.log(`📤 Publishing event:`, completeEvent);

    const message = JSON.stringify(['EVENT', completeEvent]);
    const successCount = this.broadcastToRelays(message);
    
    return successCount > 0;
  }

  // Broadcast message to all connected relays
  private broadcastToRelays(message: string): number {
    let successCount = 0;
    
    this.state.connections.forEach((connection, url) => {
      if (connection.connected && connection.ws) {
        try {
          connection.ws.send(message);
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to send to ${url}:`, error);
        }
      }
    });
    
    return successCount;
  }

  // Resubscribe to all subscriptions for a relay
  private resubscribeToRelay(url: string): void {
    this.state.subscriptions.forEach((filters, subscriptionId) => {
      const connection = this.state.connections.get(url);
      if (connection?.connected && connection.ws) {
        const message = JSON.stringify(['REQ', subscriptionId, ...filters]);
        connection.ws.send(message);
      }
    });
  }

  // Schedule reconnection to a relay
  private scheduleReconnect(url: string): void {
    const connection = this.state.connections.get(url);
    if (!connection || connection.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    connection.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, connection.reconnectAttempts - 1);
    
    console.log(`🔄 Scheduling reconnect to ${url} in ${delay}ms (attempt ${connection.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connectToRelay(url).catch(error => {
        console.error(`❌ Reconnect failed for ${url}:`, error);
      });
    }, delay);
  }

  // Initialize user identity
  async initializeUser(): Promise<string> {
    // Try to use NIP-07 extension first
    if (typeof window !== 'undefined' && (window as any).nostr) {
      try {
        const pubkey = await (window as any).nostr.getPublicKey();
        this.state.userPubkey = pubkey;
        console.log('✅ Using NIP-07 extension, pubkey:', pubkey);
        return pubkey;
      } catch (error) {
        console.log('⚠️ NIP-07 extension not available or denied');
      }
    }

    // Generate ephemeral key
    this.privateKey = generateSecretKey();
    this.state.userPubkey = getPublicKey(this.privateKey);
    console.log('✅ Generated ephemeral key, pubkey:', this.state.userPubkey);
    
    return this.state.userPubkey;
  }

  // Sign event (using NIP-07 or private key)
  async signEvent(event: Partial<Event>): Promise<Event> {
    if (typeof window !== 'undefined' && (window as any).nostr && !this.privateKey) {
      // Use NIP-07 extension
      const signedEvent = await (window as any).nostr.signEvent(event);
      return signedEvent;
    } else if (this.privateKey) {
      // Use private key with finalizeEvent
      const completeEvent = finalizeEvent({
        kind: event.kind!,
        tags: event.tags || [],
        content: event.content || '',
        created_at: Math.floor(Date.now() / 1000),
      }, this.privateKey);
      
      return completeEvent;
    } else {
      throw new Error('No signing method available');
    }
  }

  // Game-specific methods

  // Create a game session
  async createGameSession(quiz: Quiz, pin: string): Promise<string> {
    const sessionData = {
      quiz_id: quiz.id,
      pin,
      settings: {
        timePerQuestion: 20,
        pointsMode: 'standard',
      },
      created_at: Date.now(),
    };

    const event = await this.signEvent({
      kind: NOSTR_KINDS.GAME_SESSION,
      content: JSON.stringify(sessionData),
      tags: [
        ['h', this.state.userPubkey!], // host pubkey
        ['d', pin], // Use 'd' tag for PIN (commonly indexed)
        ['quiz', quiz.id],
      ],
    });

    await this.publishEvent(event);
    return event.id;
  }

  // Join a game session
  async joinGameSession(sessionId: string, nickname: string): Promise<void> {
    console.log(`🎮 Joining game session ${sessionId} as ${nickname}`);
    
    const joinData = {
      session_id: sessionId,
      nickname,
      joined_at: Date.now(),
    };

    const event = await this.signEvent({
      kind: NOSTR_KINDS.PLAYER_JOIN,
      content: JSON.stringify(joinData),
      tags: [
        ['e', sessionId], // reference to session event
        ['p', this.state.userPubkey!], // player pubkey
      ],
    });

    console.log(`👤 Publishing player join event:`, event);
    await this.publishEvent(event);
    console.log(`✅ Player join event published successfully`);
  }

  // Submit an answer
  async submitAnswer(sessionId: string, questionIndex: number, answerIndex: number): Promise<void> {
    const answerData = {
      session_id: sessionId,
      question_index: questionIndex,
      answer_index: answerIndex,
      time_ms: Date.now(),
    };

    const event = await this.signEvent({
      kind: NOSTR_KINDS.ANSWER,
      content: JSON.stringify(answerData),
      tags: [
        ['e', sessionId], // reference to session event
        ['p', this.state.userPubkey!], // player pubkey
      ],
    });

    await this.publishEvent(event);
  }

  // Update scores (host only)
  async updateScores(sessionId: string, questionIndex: number, scores: any[]): Promise<void> {
    const scoreData = {
      session_id: sessionId,
      question_index: questionIndex,
      scores,
      updated_at: Date.now(),
    };

    const event = await this.signEvent({
      kind: NOSTR_KINDS.SCORE_UPDATE,
      content: JSON.stringify(scoreData),
      tags: [
        ['e', sessionId], // reference to session event
      ],
    });

    await this.publishEvent(event);
  }

  // Find game session by PIN
  findGameSessionByPin(pin: string): void {
    this.subscribe('game-session-search', [
      {
        kinds: [NOSTR_KINDS.GAME_SESSION],
        '#d': [pin],
        limit: 10,
      }
    ]);
  }

  // Subscribe to game session events
  subscribeToGameSession(sessionId: string): void {
    console.log(`🔔 Subscribing to game session events for session: ${sessionId}`);
    this.subscribe('game-session', [
      {
        kinds: [NOSTR_KINDS.PLAYER_JOIN, NOSTR_KINDS.ANSWER, NOSTR_KINDS.SCORE_UPDATE, NOSTR_KINDS.GAME_STATE],
        '#e': [sessionId],
      }
    ]);
    console.log(`✅ Subscription set up for session: ${sessionId}`);
  }

  // Publish game state update (current question, phase, etc.)
  async publishGameState(sessionId: string, gameState: {
    phase: 'lobby' | 'playing' | 'finished';
    currentQuestionIndex?: number;
    currentQuestion?: any;
    timeLimit?: number;
    startTime?: number;
  }): Promise<string> {
    console.log(`🎮 HOST: Publishing game state for session ${sessionId}:`, gameState);
    console.log(`🎮 HOST: Using event kind ${NOSTR_KINDS.GAME_STATE} (35005)`);
    
    const event = await this.signEvent({
      kind: NOSTR_KINDS.GAME_STATE,
      content: JSON.stringify({
        session_id: sessionId,
        ...gameState,
        timestamp: Date.now(),
      }),
      tags: [
        ['e', sessionId], // Reference to game session
      ],
    });

    await this.publishEvent(event);
    console.log(`🎮 HOST: ✅ Game state published successfully: ${event.id}`);
    return event.id;
  }

  // Get connection status
  getConnectionStatus(): { isConnected: boolean; connectedRelays: number; totalRelays: number } {
    const connectedRelays = Array.from(this.state.connections.values())
      .filter(conn => conn.connected).length;
    
    return {
      isConnected: this.state.isConnected,
      connectedRelays,
      totalRelays: this.state.connections.size,
    };
  }

  // Get user pubkey
  getUserPubkey(): string | null {
    return this.state.userPubkey;
  }

  // Disconnect from all relays
  disconnect(): void {
    console.log('🔌 Disconnecting from all relays...');
    
    this.state.connections.forEach((connection) => {
      if (connection.ws) {
        connection.ws.close();
        connection.connected = false;
      }
    });
    
    this.state.isConnected = false;
    this.state.subscriptions.clear();
    this.state.eventHandlers.clear();
  }
}

// Singleton instance
let nostrService: NostrRealService | null = null;

export function getNostrService(): NostrRealService {
  if (!nostrService) {
    nostrService = new NostrRealService();
  }
  return nostrService;
}

export default NostrRealService;