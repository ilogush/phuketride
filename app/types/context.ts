/**
 * Typed Cloudflare Worker load context for React Router loaders/actions.
 * Use this instead of `context as any` to get full type safety.
 */
export interface AppLoadContext {
    cloudflare: {
        env: {
            DB: D1Database;
            ASSETS: R2Bucket;
            RATE_LIMIT: KVNamespace;
        };
        ctx: ExecutionContext;
    };
}
