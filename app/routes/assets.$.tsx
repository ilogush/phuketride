import { type LoaderFunctionArgs } from "react-router";

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
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("cache-control", "public, max-age=31536000, immutable");

        return new Response(object.body, { headers });
    } catch (error) {
        console.error("R2 fetch error:", error);
        return new Response("Internal server error", { status: 500 });
    }
}
