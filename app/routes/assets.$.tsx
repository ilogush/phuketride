import { type LoaderFunctionArgs } from "react-router";

/**
 * Asset delivery route for R2 storage
 * Handles public assets with production-ready caching and security headers
 */

const ASSET_CACHE_CONTROL = {
  // Immutable assets (hashed filenames)
  immutable: "public, max-age=31536000, immutable",
  // Long-lived assets (images, documents)
  longLived: "public, max-age=2592000", // 30 days
  // Short-lived assets (dynamic content)
  shortLived: "public, max-age=3600", // 1 hour
} as const;

const CONTENT_TYPE_CACHE: Record<string, string> = {
  // Images
  ".jpg": ASSET_CACHE_CONTROL.longLived,
  ".jpeg": ASSET_CACHE_CONTROL.longLived,
  ".png": ASSET_CACHE_CONTROL.longLived,
  ".gif": ASSET_CACHE_CONTROL.longLived,
  ".webp": ASSET_CACHE_CONTROL.longLived,
  ".svg": ASSET_CACHE_CONTROL.longLived,
  
  // Documents
  ".pdf": ASSET_CACHE_CONTROL.longLived,
  
  // Hashed assets (build artifacts)
  ".js": ASSET_CACHE_CONTROL.immutable,
  ".css": ASSET_CACHE_CONTROL.immutable,
  ".woff": ASSET_CACHE_CONTROL.immutable,
  ".woff2": ASSET_CACHE_CONTROL.immutable,
};

function getCacheControl(path: string): string {
  const ext = path.substring(path.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPE_CACHE[ext] || ASSET_CACHE_CONTROL.shortLived;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const path = params["*"];
    
    if (!path) {
        return new Response("Not found", { status: 404 });
    }

    try {
        const object = await context.cloudflare.env.ASSETS.get(path);
        
        if (!object) {
            return new Response("Not found", { status: 404 });
        }

        const headers = new Headers();
        
        // Set content metadata from R2
        object.writeHttpMetadata(headers);
        
        // Set ETag for conditional requests
        headers.set("etag", object.httpEtag);
        
        // Set cache control based on file type
        headers.set("cache-control", getCacheControl(path));
        
        // Security headers
        headers.set("x-content-type-options", "nosniff");
        
        // CORS headers for public assets
        headers.set("access-control-allow-origin", "*");
        headers.set("access-control-allow-methods", "GET, HEAD, OPTIONS");
        
        // Handle conditional requests
        const ifNoneMatch = request.headers.get("if-none-match");
        if (ifNoneMatch === object.httpEtag) {
            return new Response(null, { status: 304, headers });
        }

        return new Response(object.body, { headers });
    } catch (error) {
        console.error("R2 fetch error:", error);
        return new Response("Internal server error", { status: 500 });
    }
}
