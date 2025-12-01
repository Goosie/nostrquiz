import { GAME_CONFIG } from './constants';

// Generate random game PIN
export function generateGamePin(): string {
  return Math.floor(Math.random() * Math.pow(10, GAME_CONFIG.PIN_LENGTH))
    .toString()
    .padStart(GAME_CONFIG.PIN_LENGTH, '0');
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// Calculate score with speed bonus
export function calculateScore(
  basePoints: number,
  timeMs: number,
  timeLimitMs: number,
  enableSpeedBonus: boolean = false
): number {
  if (!enableSpeedBonus) {
    return basePoints;
  }

  const timeRatio = Math.max(0, (timeLimitMs - timeMs) / timeLimitMs);
  const speedBonus = timeRatio * GAME_CONFIG.SPEED_BONUS_MULTIPLIER;
  return Math.round(basePoints * (1 + speedBonus));
}

// Format time display
export function formatTime(seconds: number): string {
  if (seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Shuffle array (for randomizing answer options)
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Validate game PIN format
export function isValidPin(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

// Validate nickname
export function isValidNickname(nickname: string): boolean {
  return nickname.trim().length >= 2 && nickname.trim().length <= 20;
}

// Get ordinal suffix for ranking
export function getOrdinalSuffix(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;
  
  if (j === 1 && k !== 11) return 'st';
  if (j === 2 && k !== 12) return 'nd';
  if (j === 3 && k !== 13) return 'rd';
  return 'th';
}

// Format rank display
export function formatRank(rank: number): string {
  return `${rank}${getOrdinalSuffix(rank)}`;
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}

// Local storage helpers
export const storage = {
  get: <T>(key: string, defaultValue?: T): T | null => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },
  
  set: <T>(key: string, value: T): void => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  },
  
  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove from localStorage:', error);
    }
  }
};