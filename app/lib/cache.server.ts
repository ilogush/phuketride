// Caching layer using Cloudflare KV
// Caches reference data (dictionaries) to reduce DB queries

import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";

const CACHE_TTL = {
    dictionaries: 3600, // 1 hour for reference data
    short: 300, // 5 minutes for frequently changing data
    long: 86400, // 24 hours for rarely changing data
};

export async function getCachedDictionaries(
    kv: KVNamespace | undefined,
    db: ReturnType<typeof drizzle>
) {
    const cacheKey = 'dictionaries:all';

    // Try to get from cache
    if (kv) {
        try {
            const cached = await kv.get(cacheKey, 'json');
            if (cached) {
                return cached as any;
            }
        } catch (error) {
            console.error('Cache read error:', error);
        }
    }

    // Cache miss - fetch from DB
    const [
        colors,
        brands,
        models,
        bodyTypes,
        fuelTypes,
        locations,
        districts,
        countries,
    ] = await Promise.all([
        db.select().from(schema.colors).limit(100),
        db.select().from(schema.carBrands).limit(100),
        db.select().from(schema.carModels).limit(500),
        db.select().from(schema.bodyTypes).limit(50),
        db.select().from(schema.fuelTypes).limit(50),
        db.select().from(schema.locations).limit(100),
        db.select().from(schema.districts).where(eq(schema.districts.isActive, true)).limit(200),
        db.select().from(schema.countries).limit(300),
    ]);

    const data = {
        colors,
        brands,
        models,
        bodyTypes,
        fuelTypes,
        locations,
        districts,
        countries,
        cachedAt: new Date().toISOString(),
    };

    // Store in cache
    if (kv) {
        try {
            await kv.put(cacheKey, JSON.stringify(data), {
                expirationTtl: CACHE_TTL.dictionaries,
            });
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    return data;
}

export async function invalidateDictionaryCache(kv: KVNamespace | undefined) {
    if (!kv) return;
    
    try {
        await kv.delete('dictionaries:all');
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
}

// Generic cache helpers
export async function getCached<T>(
    kv: KVNamespace | undefined,
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = CACHE_TTL.short
): Promise<T> {
    if (kv) {
        try {
            const cached = await kv.get(key, 'json');
            if (cached) {
                return cached as T;
            }
        } catch (error) {
            console.error('Cache read error:', error);
        }
    }

    const data = await fetcher();

    if (kv) {
        try {
            await kv.put(key, JSON.stringify(data), { expirationTtl: ttl });
        } catch (error) {
            console.error('Cache write error:', error);
        }
    }

    return data;
}

export async function invalidateCache(kv: KVNamespace | undefined, key: string) {
    if (!kv) return;
    
    try {
        await kv.delete(key);
    } catch (error) {
        console.error('Cache invalidation error:', error);
    }
}
