import { redirect } from "react-router";

type FeedbackKey = "success" | "error";

function withFeedback(path: string, key: FeedbackKey, message: string): string {
    const url = new URL(path, "http://local");
    url.searchParams.set(key, message);
    return `${url.pathname}${url.search}${url.hash}`;
}

export function toSuccessPath(path: string, message: string): string {
    return withFeedback(path, "success", message);
}

export function toErrorPath(path: string, message: string): string {
    return withFeedback(path, "error", message);
}

export function redirectWithSuccess(path: string, message: string) {
    return redirect(toSuccessPath(path, message));
}

export function redirectWithError(path: string, message: string) {
    return redirect(toErrorPath(path, message));
}

/**
 * DEPRECATED: Use withModCompanyId from mod-mode.server.ts instead
 * This is kept for backward compatibility with existing route-feedback patterns
 */
function getRequestModCompanyIdRaw(request: Request): string | null {
    const url = new URL(request.url);
    const raw = url.searchParams.get("modCompanyId");
    return raw && raw.trim() ? raw : null;
}

function withModCompanyIdString(path: string, modCompanyId: string | null) {
    if (!modCompanyId) return path;
    const separator = path.includes("?") ? "&" : "?";
    return `${path}${separator}modCompanyId=${modCompanyId}`;
}

export function redirectWithRequestSuccess(request: Request, path: string, message: string) {
    return redirectWithSuccess(withModCompanyIdString(path, getRequestModCompanyIdRaw(request)), message);
}

export function redirectWithRequestError(request: Request, path: string, message: string) {
    return redirectWithError(withModCompanyIdString(path, getRequestModCompanyIdRaw(request)), message);
}
