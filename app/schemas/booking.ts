import { z } from "zod";

export const bookingSchema = z.object({
  carId: z.string().min(1, "Car is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  clientName: z.string().min(1, "Client name is required"),
  clientSurname: z.string().min(1, "Client surname is required"),
  clientPhone: z.string().min(9, "Phone must be at least 9 digits"),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  clientPassport: z.string().optional(),
  depositAmount: z.string().optional(),
  depositPaid: z.string().optional(),
  pickupDistrictId: z.string().optional(),
  pickupHotel: z.string().optional(),
  pickupRoom: z.string().optional(),
  returnDistrictId: z.string().optional(),
  returnHotel: z.string().optional(),
  returnRoom: z.string().optional(),
  fullInsurance: z.string().optional(),
  babySeat: z.string().optional(),
  islandTrip: z.string().optional(),
  krabiTrip: z.string().optional(),
  notes: z.string().optional(),
});

export const bookingActionSchema = z.object({
  intent: z.enum(["create", "update", "delete", "cancel", "convert"] as const),
  id: z.coerce.number().optional(),
});
