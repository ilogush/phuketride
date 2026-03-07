import { useToast } from "~/lib/toast";

type AsyncToastActionOptions<T> = {
    successMessage?: string;
    errorMessage?: string;
    getSuccessMessage?: (result: T) => string | null | undefined;
    getErrorMessage?: (error: unknown) => string | null | undefined;
    onSuccess?: (result: T) => Promise<void> | void;
};

export function useAsyncToastAction() {
    const toast = useToast();

    const notifySuccess = async (message: string, duration?: number) => {
        await toast.success(message, duration);
    };

    const notifyError = async (message: string, duration?: number) => {
        await toast.error(message, duration);
    };

    const run = async <T>(
        action: () => Promise<T>,
        {
            successMessage,
            errorMessage,
            getSuccessMessage,
            getErrorMessage,
            onSuccess,
        }: AsyncToastActionOptions<T> = {}
    ): Promise<T | null> => {
        try {
            const result = await action();
            const resolvedSuccessMessage = getSuccessMessage?.(result) ?? successMessage;

            if (resolvedSuccessMessage) {
                await toast.success(resolvedSuccessMessage);
            }

            await onSuccess?.(result);
            return result;
        } catch (error) {
            const resolvedErrorMessage =
                getErrorMessage?.(error) ??
                (error instanceof Error ? error.message : null) ??
                errorMessage ??
                "Operation failed";

            await toast.error(resolvedErrorMessage);
            return null;
        }
    };

    return {
        run,
        notifySuccess,
        notifyError,
    };
}
