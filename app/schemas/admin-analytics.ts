import { z } from "zod";

export const clearAuditLogsSchema = z.object({
    intent: z.enum(["clear"], { errorMap: () => ({ message: "Invalid action" }) }),
});

export const dashboardTaskDeleteSchema = z.object({
    intent: z.enum(["delete"], { errorMap: () => ({ message: "Invalid action" }) }),
    taskId: z.coerce.number().int().positive("Invalid task"),
});
