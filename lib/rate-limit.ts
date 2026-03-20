/**
 * In-memory rate limiter for the chat API.
 *
 * Free users: 20 messages per hour.
 * Subscribed users (active Stripe subscription): unlimited.
 */

const MAX_MESSAGES_PER_HOUR = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

/**
 * Check and consume a rate limit slot for the given user.
 *
 * @returns `null` if allowed, or an object with `retryAfterSeconds` if rate-limited.
 */
export function checkRateLimit(
  userId: string
): { retryAfterSeconds: number } | null {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  // First request or window expired → reset
  if (!entry || now >= entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + ONE_HOUR_MS });
    return null;
  }

  // Within window — check count
  if (entry.count >= MAX_MESSAGES_PER_HOUR) {
    const retryAfterSeconds = Math.ceil((entry.resetTime - now) / 1000);
    return { retryAfterSeconds };
  }

  // Allowed — increment
  entry.count += 1;
  return null;
}
