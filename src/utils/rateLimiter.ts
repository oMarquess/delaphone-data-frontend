import { RATE_LIMIT } from '@/config/constants';

interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blocked: boolean;
}

class RateLimiter {
  private static instance: RateLimiter;
  private attempts: Map<string, RateLimitEntry>;
  private readonly MAX_ATTEMPTS = RATE_LIMIT.MAX_ATTEMPTS;
  private readonly WINDOW_MS = RATE_LIMIT.WINDOW_DURATION;
  private readonly BLOCK_DURATION_MS = RATE_LIMIT.BLOCK_DURATION;

  private constructor() {
    this.attempts = new Map();
  }

  public static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  public checkRateLimit(identifier: string): { blocked: boolean; remainingAttempts: number; waitTime: number } {
    const now = Date.now();
    const entry = this.attempts.get(identifier);

    if (!entry) {
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        blocked: false
      });
      return { blocked: false, remainingAttempts: this.MAX_ATTEMPTS - 1, waitTime: 0 };
    }

    // Check if currently blocked
    if (entry.blocked) {
      const timeElapsed = now - entry.firstAttempt;
      if (timeElapsed < this.BLOCK_DURATION_MS) {
        const waitTime = this.BLOCK_DURATION_MS - timeElapsed;
        return { blocked: true, remainingAttempts: 0, waitTime };
      } else {
        // Reset after block duration
        this.attempts.delete(identifier);
        return { blocked: false, remainingAttempts: this.MAX_ATTEMPTS, waitTime: 0 };
      }
    }

    // Check if window has expired
    const timeElapsed = now - entry.firstAttempt;
    if (timeElapsed > this.WINDOW_MS) {
      // Reset window
      this.attempts.set(identifier, {
        count: 1,
        firstAttempt: now,
        blocked: false
      });
      return { blocked: false, remainingAttempts: this.MAX_ATTEMPTS - 1, waitTime: 0 };
    }

    // Increment attempt count
    entry.count += 1;

    // Check if should be blocked
    if (entry.count > this.MAX_ATTEMPTS) {
      entry.blocked = true;
      return { blocked: true, remainingAttempts: 0, waitTime: this.BLOCK_DURATION_MS };
    }

    return {
      blocked: false,
      remainingAttempts: this.MAX_ATTEMPTS - entry.count,
      waitTime: 0
    };
  }

  public recordFailedAttempt(identifier: string): void {
    const entry = this.attempts.get(identifier);
    if (!entry) {
      this.checkRateLimit(identifier);
    }
  }

  public reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const rateLimiter = RateLimiter.getInstance(); 