import { z } from "zod";

export const userSchema = z.object({
    email: z.string().email("Invalid email format"),
    role: z.enum(["admin", "partner", "manager", "user"], { 
        errorMap: () => ({ message: "Invalid role" }) 
    }),
    name: z.string().min(1, "Name is required").max(100, "Name is too long").optional().nullable(),
    surname: z.string().min(1, "Surname is required").max(100, "Surname is too long").optional().nullable(),
    phone: z.string().min(9, "Phone must contain at least 9 digits").max(20, "Phone is too long").optional().nullable(),
    whatsapp: z.string().max(20, "WhatsApp is too long").optional().nullable(),
    telegram: z.string().max(100, "Telegram is too long").optional().nullable(),
    passportNumber: z.string().max(50, "Passport number is too long").optional().nullable(),
    citizenship: z.string().max(100, "Citizenship is too long").optional().nullable(),
    city: z.string().max(100, "City is too long").optional().nullable(),
    countryId: z.number().int().positive("Country is required").optional().nullable(),
    dateOfBirth: z.string().optional().nullable(),
    gender: z.enum(["male", "female", "other"], { 
        errorMap: () => ({ message: "Invalid gender" }) 
    }).optional().nullable(),
    hotelId: z.number().int().positive("Hotel is required").optional().nullable(),
    roomNumber: z.string().max(20, "Room number is too long").optional().nullable(),
    locationId: z.number().int().positive("Location is required").optional().nullable(),
    districtId: z.number().int().positive("District is required").optional().nullable(),
    address: z.string().max(500, "Address is too long").optional().nullable(),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = userSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
});

export type UserFormData = z.infer<typeof userSchema>;
export type LoginFormData = z.infer<typeof loginSchema>;
export type RegisterFormData = z.infer<typeof registerSchema>;
