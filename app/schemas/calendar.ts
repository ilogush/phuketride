import { z } from "zod";

export const calendarEventSchema = z.object({
    title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
    description: z.string().trim().max(2000, "Description is too long").optional().nullable(),
    eventType: z.enum(
        ["meeting", "delivery", "pickup", "maintenance", "document_expiry", "payment_due", "other"],
        { errorMap: () => ({ message: "Event type is required" }) }
    ),
    startDate: z.string().trim().min(1, "Start date is required"),
    endDate: z.string().trim().optional().nullable(),
    color: z.string().trim().optional().nullable(),
});

export const calendarApiQuerySchema = z.object({
    limit: z.coerce.number().int().positive().max(50).default(5),
});
