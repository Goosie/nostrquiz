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
      // Pool automatically connects when needed
      console.log('NostrService initialized with relays:', this.relays);
    } catch (error) {
      console.error('Failed to connect to Nostr relays:', error);
      throw error;
    }
  }

  // Disconnect from relays
  async disconnect(): Promise<void> {
    try {
      // Close all subscriptions
      for (const [id, sub] of this.subscriptions) {
        sub.close();
      }
      this.subscriptions.clear();
      
      // Close pool connections
      this.pool.close(this.relays);
      console.log('Disconnected from Nostr relays');
    } catch (error) {
      console.error('Error disconnecting from Nostr relays:', error);
    }
  }

  // Get user's public key from NIP-07 extension
  async getPublicKey(): Promise<string> {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      try {
        const pubkey = await (window as any).nostr.getPublicKey();
        return pubkey;
      } catch (error) {
        console.error('Failed to get public key from extension:', error);
        throw new Error('Please install and unlock a Nostr browser extension (Alby, nos2x, etc.)');
      }
    } else {
      throw new Error('No Nostr extension found. Please install Alby, nos2x, or another NIP-07 compatible extension.');
    }
  }

  // Sign event using NIP-07 extension
  async signEvent(event: Partial<Event>): Promise<Event> {
    if (typeof window !== 'undefined' && (window as any).nostr) {
      try {
        const signedEvent = await (window as any).nostr.signEvent(event);
        return signedEvent;
      } catch (error) {
        console.error('Failed to sign event:', error);
        throw new Error('Failed to sign event. Please check your Nostr extension.');
      }
    } else {
      throw new Error('No Nostr extension found for signing.');
    }
  }

  // Create and sign an event
  async createEvent(
    kind: number,
    content: string,
    tags: string[][] = []
  ): Promise<Event> {
    const pubkey = await this.getPublicKey();
    
    const event: Partial<Event> = {
      kind,
      pubkey,
      created_at: Math.floor(Date.now() / 1000),
      tags,
      content,
    };

    // Calculate event hash
    event.id = getEventHash(event as Event);
    
    // Sign the event
    return await this.signEvent(event);
  }

  // Publish an event to relays
  async publishEvent(event: Event): Promise<void> {
    try {
      const promises = this.pool.publish(this.relays, event);
      await Promise.allSettled(promises);
      console.log('Event published:', event.id);
    } catch (error) {
      console.error('Failed to publish event:', error);
      throw error;
    }
  }

  // Subscribe to events with a filter
  subscribe(
    filters: Filter[],
    onEvent: (event: Event) => void,
    onEose?: () => void
  ): string {
    const subId = Math.random().toString(36).substring(7);
    
    const sub = this.pool.subscribeMany(
      this.relays,
      filters,
      {
        onevent: onEvent,
        oneose: onEose,
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

  // Publish quiz definition
  async publishQuizDefinition(quiz: QuizDefinition): Promise<Event> {
    const content = JSON.stringify({
      title: quiz.title,
      description: quiz.description,
      language: quiz.language,
      questions: quiz.questions.map(q => ({
        text: q.text,
        type: q.type,
        options: q.options,
        correct_index: q.correct_index,
        time_limit_seconds: q.time_limit_seconds,
        points: q.points
      }))
    });

    const tags = [
      ['d', quiz.id],
      ...(quiz.formstr_event_id ? [['formstr', quiz.formstr_event_id]] : [])
    ];

    const event = await this.createEvent(35000, content, tags);
    await this.publishEvent(event);
    return event;
  }

  // Publish game session
  async publishGameSession(session: GameSession): Promise<Event> {
    const content = JSON.stringify({
      quiz_id: session.quiz_id,
      pin: session.pin,
      settings: session.settings
    });

    const tags = [
      ['h', session.host_pubkey],
      ['d', session.id]
    ];

    const event = await this.createEvent(35001, content, tags);
    await this.publishEvent(event);
    return event;
  }

  // Publish player join
  async publishPlayerJoin(join: PlayerJoin): Promise<Event> {
    const content = JSON.stringify({
      session_id: join.session_id,
      nickname: join.nickname
    });

    const tags = [
      ['p', join.player_pubkey],
      ['e', join.session_event_id]
    ];

    const event = await this.createEvent(35002, content, tags);
    await this.publishEvent(event);
    return event;
  }

  // Publish answer
  async publishAnswer(answer: Answer): Promise<Event> {
    const content = JSON.stringify({
      session_id: answer.session_id,
      question_index: answer.question_index,
      answer_index: answer.answer_index,
      time_ms: answer.time_ms
    });

    const tags = [
      ['p', answer.player_pubkey],
      ['e', answer.session_event_id]
    ];

    const event = await this.createEvent(35003, content, tags);
    await this.publishEvent(event);
    return event;
  }

  // Publish score update
  async publishScoreUpdate(scoreUpdate: ScoreUpdate): Promise<Event> {
    const content = JSON.stringify({
      session_id: scoreUpdate.session_id,
      question_index: scoreUpdate.question_index,
      scores: scoreUpdate.scores
    });

    const tags = [
      ['e', scoreUpdate.session_event_id]
    ];

    const event = await this.createEvent(35004, content, tags);
    await this.publishEvent(event);
    return event;
  }

  // Find game session by PIN
  async findGameSessionByPin(pin: string): Promise<GameSession | null> {
    return new Promise((resolve) => {
      let found = false;
      
      const filters: Filter[] = [{
        kinds: [35001],
        limit: 100
      }];

      const subId = this.subscribe(
        filters,
        (event) => {
          if (found) return;
          
          try {
            const content = JSON.parse(event.content);
            if (content.pin === pin) {
              found = true;
              this.unsubscribe(subId);
              
              const session: GameSession = {
                id: event.id,
                quiz_id: content.quiz_id,
                host_pubkey: event.pubkey,
                pin: content.pin,
                settings: content.settings,
                created_at: event.created_at
              };
              
              resolve(session);
            }
          } catch (error) {
            console.error('Error parsing game session event:', error);
          }
        },
        () => {
          // End of stored events
          if (!found) {
            this.unsubscribe(subId);
            resolve(null);
          }
        }
      );

      // Timeout after 5 seconds
      setTimeout(() => {
        if (!found) {
          found = true;
          this.unsubscribe(subId);
          resolve(null);
        }
      }, 5000);
    });
  }

  // Subscribe to game session events
  subscribeToGameSession(
    sessionId: string,
    onPlayerJoin?: (join: PlayerJoin) => void,
    onAnswer?: (answer: Answer) => void,
    onScoreUpdate?: (scoreUpdate: ScoreUpdate) => void
  ): string {
    const filters: Filter[] = [
      {
        kinds: [35002, 35003, 35004],
        '#e': [sessionId]
      }
    ];

    return this.subscribe(filters, (event) => {
      try {
        const content = JSON.parse(event.content);
        
        switch (event.kind) {
          case 35002: // Player Join
            if (onPlayerJoin) {
              const join: PlayerJoin = {
                session_id: content.session_id,
                session_event_id: sessionId,
                player_pubkey: event.pubkey,
                nickname: content.nickname,
                created_at: event.created_at
              };
              onPlayerJoin(join);
            }
            break;
            
          case 35003: // Answer
            if (onAnswer) {
              const answer: Answer = {
                session_id: content.session_id,
                session_event_id: sessionId,
                player_pubkey: event.pubkey,
                question_index: content.question_index,
                answer_index: content.answer_index,
                time_ms: content.time_ms,
                created_at: event.created_at
              };
              onAnswer(answer);
            }
            break;
            
          case 35004: // Score Update
            if (onScoreUpdate) {
              const scoreUpdate: ScoreUpdate = {
                session_id: content.session_id,
                session_event_id: sessionId,
                question_index: content.question_index,
                scores: content.scores,
                created_at: event.created_at
              };
              onScoreUpdate(scoreUpdate);
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing game session event:', error);
      }
    });
  }

  // Generate ephemeral keypair for players without Nostr extension
  generateEphemeralKeypair(): { privateKey: string; publicKey: string; npub: string } {
    const privateKey = generateSecretKey();
    const publicKey = getPublicKey(privateKey);
    const npub = nip19.npubEncode(publicKey);
    
    return { privateKey, publicKey, npub };
  }

  // Sign event with private key (for ephemeral users)
  signEventWithPrivateKey(event: Partial<Event>, privateKey: string): Event {
    const eventWithId = {
      ...event,
      id: getEventHash(event as Event)
    } as Event;
    
    eventWithId.sig = getSignature(eventWithId, privateKey);
    return eventWithId;
  }
}

// Lazy singleton instance
let _nostrService: NostrService | null = null;

export function getNostrService(): NostrService {
  if (!_nostrService) {
    _nostrService = new NostrService();
  }
  return _nostrService;
}