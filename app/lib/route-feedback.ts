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
