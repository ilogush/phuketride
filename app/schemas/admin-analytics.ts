import { z } from "zod";

export const clearAuditLogsSchema = z.object({
    intent: z.enum(["clear"] as const, { message: "Invalid action" }),
});

export const dashboardTaskDeleteSchema = z.object({
    intent: z.enum(["delete"] as const, { message: "Invalid action" }),
    taskId: z.coerce.number().int().positive("Invalid task"),
});
