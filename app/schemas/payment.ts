import { z } from "zod";

export const paymentSchema = z.object({
    contractId: z.coerce.number().int().positive("Contract is required"),
    paymentTypeId: z.coerce.number().int().positive("Payment type is required"),
    amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
    currency: z.string().trim().length(3, "Currency must be 3 characters").default("THB"),
    status: z.enum(["pending", "completed", "cancelled"] as const).default("completed"),
    notes: z.string().trim().max(500, "Notes are too long").optional().nullable(),
    createdBy: z.string().uuid("Invalid user ID").optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
