// Rate limiting using Cloudflare KV
// Protects against spam and abuse

interface RateLimitConfig {
    limit: number; // Max requests
    window: number; // Time window in seconds
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
    // Authentication endpoints
    login: { limit: 5, window: 60 }, // 5 attempts per minute
    register: { limit: 3, window: 300 }, // 3 registrations per 5 minutes
    
    // API endpoints
    api: { limit: 100, window: 60 }, // 100 requests per minute
    
    // Form submissions
    form: { limit: 10, window: 60 }, // 10 submissions per minute
    
    // Default
    default: { limit: 60, window: 60 }, // 60 requests per minute
};

export async function checkRateLimit(
    kv: KVNamespace | undefined,
    identifier: string, // IP or user ID
    action: keyof typeof RATE_LIMITS = 'default'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    // If KV is not available, allow the request (development mode)
    if (!kv) {
        return { allowed: true, remaining: 999, resetAt: Date.now() + 60000 };
    }

    const config = RATE_LIMITS[action] || RATE_LIMITS.default;
    const key = `rate_limit:${action}:${identifier}`;
    const now = Date.now();
    const windowStart = now - (config.window * 1000);

    try {
        // Get current count from KV
        const data = await kv.get(key, 'json') as { count: number; resetAt: number } | null;

        if (!data || data.resetAt < now) {
            // First request or window expired - create new window
            const resetAt = now + (config.window * 1000);
            await kv.put(key, JSON.stringify({ count: 1, resetAt }), {
                expirationTtl: config.window,
            });
            return { allowed: true, remaining: config.limit - 1, resetAt };
        }

        // Check if limit exceeded
        if (data.count >= config.limit) {
            return { allowed: false, remaining: 0, resetAt: data.resetAt };
        }

        // Increment counter
        const newCount = data.count + 1;
        await kv.put(key, JSON.stringify({ count: newCount, resetAt: data.resetAt }), {
            expirationTtl: Math.ceil((data.resetAt - now) / 1000),
        });

        return {
            allowed: true,
            remaining: config.limit - newCount,
            resetAt: data.resetAt,
        };
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // On error, allow the request to avoid blocking legitimate users
        return { allowed: true, remaining: config.limit, resetAt: now + (config.window * 1000) };
    }
}

export function getRateLimitHeaders(result: { remaining: number; resetAt: number }) {
    return {
        'X-RateLimit-Remaining': result.remaining.toString(),
        'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    };
}

// Helper to get client identifier (IP or user ID)
export function getClientIdentifier(request: Request, userId?: string): string {
    if (userId) return `user:${userId}`;
    
    // Try to get IP from Cloudflare headers
    const cfConnectingIp = request.headers.get('CF-Connecting-IP');
    if (cfConnectingIp) return `ip:${cfConnectingIp}`;
    
    // Fallback to X-Forwarded-For
    const xForwardedFor = request.headers.get('X-Forwarded-For');
    if (xForwardedFor) {
        const ip = xForwardedFor.split(',')[0].trim();
        return `ip:${ip}`;
    }
    
    // Last resort - use a generic identifier
    return 'ip:unknown';
}
