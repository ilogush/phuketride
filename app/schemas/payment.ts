import { z } from "zod";

export const paymentSchema = z.object({
    contractId: z.number().int().positive("Contract is required"),
    paymentTypeId: z.number().int().positive("Payment type is required"),
    amount: z.number().min(0.01, "Amount must be greater than 0"),
    currency: z.string().length(3, "Currency must be 3 characters").default("THB"),
    paymentMethod: z.enum(["cash", "bank_transfer", "card"] as const, { message: "Invalid payment method" }),
    status: z.enum(["pending", "completed", "cancelled"] as const, { message: "Invalid status" }).default("completed"),
    notes: z.string().max(500, "Notes are too long").optional().nullable(),
    createdBy: z.string().uuid("Invalid user ID").optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
