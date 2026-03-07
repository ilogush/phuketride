import { useEffect, useRef } from "react";
import { useToast } from "~/lib/toast";

type ActionToastType = "error" | "success" | "info" | "warning";

type UseActionToastOptions = {
    type?: ActionToastType;
    duration?: number;
};

export function useActionToast(message?: string | null, options: UseActionToastOptions = {}) {
    const toast = useToast();
    const lastMessageRef = useRef<string | null>(null);
    const { type = "error", duration } = options;

    useEffect(() => {
        if (!message) {
            lastMessageRef.current = null;
            return;
        }

        if (lastMessageRef.current === message) {
            return;
        }

        lastMessageRef.current = message;
        void toast[type](message, duration);
    }, [duration, message, toast, type]);
}
