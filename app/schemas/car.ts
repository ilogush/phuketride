import { z } from "zod";

export const carSchema = z.object({
    templateId: z.number().int().positive("Template is required").optional().nullable(),
    year: z.number().int().min(1900, "Year must be valid").max(new Date().getFullYear() + 1, "Year must be valid").optional().nullable(),
    colorId: z.number().int().positive("Color is required"),
    licensePlate: z.string().min(1, "License plate is required").max(20, "License plate is too long"),
    transmission: z.enum(["automatic", "manual"], { errorMap: () => ({ message: "Invalid transmission type" }) }),
    engineVolume: z.number().min(0.1, "Engine volume must be positive").max(10, "Engine volume is too large"),
    fuelType: z.enum(["petrol", "diesel", "electric", "hybrid"], { errorMap: () => ({ message: "Invalid fuel type" }) }),
    status: z.enum(["available", "rented", "maintenance", "booked"], { errorMap: () => ({ message: "Invalid status" }) }),
    vin: z.string().max(50, "VIN is too long").optional().nullable(),
    // Maintenance
    currentMileage: z.number().int().min(0, "Mileage must be positive"),
    nextOilChangeMileage: z.number().int().min(0, "Next oil change mileage must be positive"),
    oilChangeInterval: z.number().int().min(1000, "Oil change interval must be at least 1000 km").max(50000, "Oil change interval is too large").optional(),
    // Pricing
    pricePerDay: z.number().min(0, "Price per day must be positive"),
    deposit: z.number().min(0, "Deposit must be positive"),
    // Insurance
    insuranceType: z.string().max(100, "Insurance type is too long").optional().nullable(),
    insuranceExpiry: z.string().optional().nullable(),
    registrationExpiry: z.string().optional().nullable(),
    taxRoadExpiry: z.string().optional().nullable(),
    fullInsuranceMinDays: z.number().int().min(1, "Minimum days must be at least 1").optional().nullable(),
    minInsurancePrice: z.number().min(0, "Minimum insurance price must be positive").optional().nullable(),
    maxInsurancePrice: z.number().min(0, "Maximum insurance price must be positive").optional().nullable(),
});

export type CarFormData = z.infer<typeof carSchema>;
