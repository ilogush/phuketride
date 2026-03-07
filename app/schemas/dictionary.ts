import { z } from "zod";

// Generic schema for simple dictionary items (colors, brands, models, etc.)
export const colorSchema = z.object({
    name: z.string().min(1, "Name is required").max(50, "Name is too long"),
    hexCode: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color code").optional().nullable(),
});

export const brandSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
});

export const modelSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    brandId: z.number().int().positive("Brand is required"),
});

export const districtSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name is too long"),
    locationId: z.number().int().positive("Location is required"),
    isActive: z.boolean().optional(),
});

const districtActionBaseSchema = z.object({
    name: z.string().trim().min(1, "District name is required").max(200, "District name is too long"),
    locationId: z.coerce.number().int().positive("Location is required"),
    deliveryPrice: z.coerce.number().min(0, "Delivery price must be 0 or greater"),
    beaches: z.string().trim().max(1000, "Beaches description is too long").optional().nullable(),
});

export const districtActionSchema = z.discriminatedUnion("intent", [
    z.object({
        intent: z.literal("delete"),
        id: z.coerce.number().int().positive("District id is required"),
    }),
    districtActionBaseSchema.extend({
        intent: z.literal("create"),
    }),
    districtActionBaseSchema.extend({
        intent: z.literal("update"),
        id: z.coerce.number().int().positive("District id is required"),
    }),
]);

export const hotelSchema = z.object({
    name: z.string().min(1, "Name is required").max(200, "Name is too long"),
    districtId: z.number().int().positive("District is required"),
    address: z.string().max(500, "Address is too long").optional().nullable(),
});

export const seasonSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    companyId: z.number().int().positive("Company is required"),
    multiplier: z.number().min(0.1, "Multiplier must be at least 0.1").max(10, "Multiplier is too large"),
    startMonth: z.number().int().min(1, "Start month must be 1-12").max(12, "Start month must be 1-12"),
    startDay: z.number().int().min(1, "Start day must be 1-31").max(31, "Start day must be 1-31"),
    endMonth: z.number().int().min(1, "End month must be 1-12").max(12, "End month must be 1-12"),
    endDay: z.number().int().min(1, "End day must be 1-31").max(31, "End day must be 1-31"),
});

export const durationSchema = z.object({
    name: z.string().min(1, "Name is required").max(100, "Name is too long"),
    companyId: z.number().int().positive("Company is required"),
    minDays: z.number().int().min(1, "Minimum days must be at least 1"),
    maxDays: z.number().int().min(1, "Maximum days must be at least 1").optional().nullable(),
    multiplier: z.number().min(0.1, "Multiplier must be at least 0.1").max(10, "Multiplier is too large"),
}).refine((data) => !data.maxDays || data.maxDays >= data.minDays, {
    message: "Maximum days must be greater than or equal to minimum days",
    path: ["maxDays"],
});

export type ColorFormData = z.infer<typeof colorSchema>;
export type BrandFormData = z.infer<typeof brandSchema>;
export type ModelFormData = z.infer<typeof modelSchema>;
export type DistrictFormData = z.infer<typeof districtSchema>;
export type HotelFormData = z.infer<typeof hotelSchema>;
export type SeasonFormData = z.infer<typeof seasonSchema>;
export type DurationFormData = z.infer<typeof durationSchema>;
