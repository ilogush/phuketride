import { z } from "zod";
import { PASSWORD_MIN_LENGTH } from "~/lib/password";

const latinNameRegex = /^[a-zA-Z\s\-']+$/;
const phoneRegex = /^\+?[0-9]{10,15}$/;

export const userRegistrationSchema = z.object({
    email: z.string().trim().email("Invalid email format"),
    password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    firstName: z
        .string()
        .trim()
        .min(1, "First name is required")
        .regex(latinNameRegex, "Only Latin characters allowed in first name"),
    lastName: z
        .string()
        .trim()
        .min(1, "Last name is required")
        .regex(latinNameRegex, "Only Latin characters allowed in last name"),
    phone: z
        .string()
        .trim()
        .refine((value) => phoneRegex.test(value.replace(/[\s\-()]/g, "")), "Invalid phone number format"),
});

export const partnerRegistrationSchema = z.object({
    email: z.string().trim().email("Invalid email format"),
    password: z
        .string()
        .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
    name: z
        .string()
        .trim()
        .min(1, "First name is required")
        .regex(latinNameRegex, "Only Latin characters allowed in first name"),
    surname: z
        .string()
        .trim()
        .min(1, "Last name is required")
        .regex(latinNameRegex, "Only Latin characters allowed in last name"),
    phone: z
        .string()
        .trim()
        .refine((value) => phoneRegex.test(value.replace(/[\s\-()]/g, "")), "Invalid phone number format"),
    telegram: z.string().trim().optional(),
    companyName: z.string().trim().min(1, "Company name is required"),
    districtId: z.coerce.number().int().positive("District is required"),
    street: z.string().trim().min(1, "Street is required"),
    houseNumber: z.string().trim().min(1, "House number is required"),
});

export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type PartnerRegistrationInput = z.infer<typeof partnerRegistrationSchema>;
