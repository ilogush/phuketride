import { createRequestHandler } from "react-router";
import { setRuntimeEnv } from "~/lib/runtime-env.server";

declare global {
  interface Env {
    RATE_LIMIT?: KVNamespace;
    SESSION_SECRET?: string;
  }
}

declare module "react-router" {
  export interface AppLoadContext {
    cloudflare: {
      env: Env & {
        DB: D1Database;
        ASSETS: R2Bucket;
      };
      ctx: ExecutionContext;
    };
  }
}

const requestHandler = createRequestHandler(
  () => import("virtual:react-router/server-build"),
  import.meta.env.MODE
);

export default {
  async fetch(request, env, ctx) {
    setRuntimeEnv(env, import.meta.env.MODE);
    return requestHandler(request, {
      cloudflare: { env, ctx },
    });
  },
} satisfies ExportedHandler<Env>;
