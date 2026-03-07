/**
 * Type augmentation for React Router's load context.
 * This makes `context` in all loaders and actions fully typed
 * without needing `context as any` casts.
 *
 * @see https://reactrouter.com/dev/guides/custom-server
 */
import type { AppLoadContext } from "~/types/context";

declare module "react-router" {
    interface AppLoadContext extends import("~/types/context").AppLoadContext {}
}
