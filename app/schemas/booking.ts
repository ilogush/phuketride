import { z } from "zod";

export const bookingSchema = z.object({
  carId: z.coerce.number().positive("Car is required"),
  startDate: z.string().trim().min(1, "Start date is required"),
  endDate: z.string().trim().min(1, "End date is required"),
  clientName: z.string().trim().min(1, "Client name is required"),
  clientSurname: z.string().trim().min(1, "Client surname is required"),
  clientPhone: z.string().trim().min(9, "Phone must be at least 9 digits"),
  clientEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  clientPassport: z.string().trim().optional(),
  
  depositAmount: z.coerce.number().nonnegative().optional().default(0),
  depositPaid: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  
  pickupDistrictId: z.coerce.number().positive().optional().nullable(),
  pickupHotel: z.string().trim().optional().nullable(),
  pickupRoom: z.string().trim().optional().nullable(),
  returnDistrictId: z.coerce.number().positive().optional().nullable(),
  returnHotel: z.string().trim().optional().nullable(),
  returnRoom: z.string().trim().optional().nullable(),
  
  fullInsurance: z.coerce.number().nonnegative().optional().default(0),
  babySeat: z.coerce.number().nonnegative().optional().default(0),
  islandTrip: z.coerce.number().nonnegative().optional().default(0),
  krabiTrip: z.coerce.number().nonnegative().optional().default(0),
  
  notes: z.string().trim().optional().nullable(),
});

export const bookingActionSchema = z.object({
  intent: z.enum(["create", "update", "delete", "cancel", "convert"] as const),
  id: z.coerce.number().optional(),
});
