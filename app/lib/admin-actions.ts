import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";

export function parseFormIntent<TIntents extends [string, ...string[]]>(
    formData: FormData,
    intents: TIntents,
    fallback = "Invalid action"
) {
    return parseWithSchema(
        z.object({
            intent: z.enum(intents),
        }),
        {
            intent: formData.get("intent"),
        },
        fallback
    );
}

export interface MutationFeedbackOptions {
    successPath: string;
    successMessage: string;
    errorPath?: string;
    errorMessage: string;
}

export async function runMutationWithFeedback(
    mutate: () => Promise<void>,
    options: MutationFeedbackOptions
) {
    try {
        await mutate();
        return redirectWithSuccess(options.successPath, options.successMessage);
    } catch {
        return redirectWithError(options.errorPath ?? options.successPath, options.errorMessage);
    }
}
