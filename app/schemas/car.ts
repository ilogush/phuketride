import { z } from "zod";

export const carSchema = z.object({
    templateId: z.coerce.number().int().positive("Car Template is required"),
    colorId: z.coerce.number().int().positive("Color is required"),
    licensePlate: z.string().trim().min(1, "License plate is required").toUpperCase(),
    transmission: z.enum(["automatic", "manual"] as const, { message: "Invalid transmission type" }),
    engineVolume: z.coerce.number().min(0.1, "Engine volume must be positive"),
    fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"] as const, { message: "Invalid fuel type" }),
    status: z.enum(["available", "rented", "maintenance", "booked"] as const, { message: "Invalid status" }),
    
    // Maintenance
    currentMileage: z.coerce.number().int().min(0, "Mileage must be positive"),
    nextOilChangeMileage: z.coerce.number().int().min(0, "Next oil change mileage must be positive"),
    oilChangeInterval: z.coerce.number().int().min(1000).default(10000),
    
    // Pricing
    pricePerDay: z.coerce.number().min(0, "Price must be positive"),
    deposit: z.coerce.number().min(0).default(0),
    
    // Insurance & Paperwork
    insuranceType: z.string().trim().nullable().optional(),
    insuranceExpiry: z.string().trim().nullable().optional(),
    registrationExpiry: z.string().trim().nullable().optional(),
    taxRoadExpiry: z.string().trim().nullable().optional(),
    
    // Limits
    minRentalDays: z.coerce.number().int().min(1).default(1),
    
    // Full Insurance Option
    fullInsuranceEnabled: z.preprocess((v) => v === "true", z.boolean()),
    insurancePricePerDay: z.coerce.number().min(0).nullable().optional(),
    maxInsurancePrice: z.coerce.number().min(0).nullable().optional(),

    // Content
    marketingHeadline: z.string().trim().nullable().optional(),
    description: z.string().trim().nullable().optional(),

    // Photos (JSON arrays from hidden fields)
    photos: z.string().optional().default("[]"),
    greenBookPhotos: z.string().optional().default("[]"),
    insurancePhotos: z.string().optional().default("[]"),
    taxRoadPhotos: z.string().optional().default("[]"),
});

export type CarFormData = z.infer<typeof carSchema>;
