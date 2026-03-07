import { z } from "zod";

type ParseOk<T> = {
    ok: true;
    data: T;
};

type ParseFail = {
    ok: false;
    error: string;
};

export function getValidationErrorMessage(
    error: z.ZodError,
    fallback = "Validation failed"
): string {
    return error.issues[0]?.message || fallback;
}

export function parseWithSchema<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    input: unknown,
    fallback = "Validation failed"
): ParseOk<z.infer<TSchema>> | ParseFail {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
        return {
            ok: false,
            error: getValidationErrorMessage(parsed.error, fallback),
        };
    }
    return {
        ok: true,
        data: parsed.data,
    };
}
