import { z } from "zod";

const latinRegex = /^[a-zA-Z0-9\s\-'.,()&]+$/;

export const companySchema = z.object({
    name: z.string()
        .min(1, "Company name is required")
        .max(200, "Company name is too long")
        .regex(latinRegex, "Company name must contain only Latin characters"),
    email: z.string().email("Invalid email format"),
    phone: z.string().min(9, "Phone must contain at least 9 digits").max(20, "Phone is too long"),
    telegram: z.string().optional().nullable(),
    locationId: z.number().int().positive("Location is required"),
    districtId: z.number().int().positive("District is required"),
    street: z.string()
        .min(1, "Street is required")
        .max(200, "Street is too long")
        .regex(latinRegex, "Street must contain only Latin characters"),
    houseNumber: z.string()
        .min(1, "House number is required")
        .max(50, "House number is too long")
        .regex(/^[a-zA-Z0-9\s\-/]+$/, "House number must contain only Latin characters and numbers"),
    ownerId: z.string().uuid("Invalid owner ID").optional(),
    // Bank Details
    bankName: z.string()
        .max(200, "Bank name is too long")
        .refine((val) => !val || latinRegex.test(val), "Bank name must contain only Latin characters")
        .optional()
        .nullable(),
    accountNumber: z.string().max(100, "Account number is too long").optional().nullable(),
    accountName: z.string()
        .max(200, "Account name is too long")
        .refine((val) => !val || latinRegex.test(val), "Account name must contain only Latin characters")
        .optional()
        .nullable(),
    swiftCode: z.string().max(50, "SWIFT code is too long").optional().nullable(),
    // Booking Settings
    preparationTime: z.number().int().min(0, "Preparation time must be positive").max(1440, "Preparation time is too long").optional(),
    deliveryFeeAfterHours: z.number().min(0, "Delivery fee must be positive").optional(),
    islandTripPrice: z.number().min(0, "Island trip price must be positive").optional().nullable(),
    krabiTripPrice: z.number().min(0, "Krabi trip price must be positive").optional().nullable(),
    babySeatPricePerDay: z.number().min(0, "Baby seat price must be positive").optional().nullable(),
});

export type CompanyFormData = z.infer<typeof companySchema>;
