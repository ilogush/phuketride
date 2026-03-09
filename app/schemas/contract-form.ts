import { z } from "zod";

/**
 * Schema used for validating raw HTML form data in the "create contract" action.
 * Uses snake_case field names matching FormData keys.
 */
export const createContractFormSchema = z.object({
  // Car identification
  company_car_id: z.coerce.number().int().positive("Car is required"),
  
  // Client details
  client_passport: z.string().trim().min(3, "Client passport is required"),
  client_name: z.string().trim().min(2, "Client name is required"),
  client_surname: z.string().trim().min(2, "Client surname is required"),
  client_phone: z.string().trim().min(5, "Client phone is required"),
  client_email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  client_whatsapp: z.string().trim().optional(),
  client_telegram: z.string().trim().optional(),

  // Dates
  start_date: z.string().trim().min(1, "Start date is required"),
  end_date: z.string().trim().min(1, "End date is required"),

  // Financial details
  currency_id: z.coerce.number().int().positive().default(1),
  total_amount: z.coerce.number().positive("Total amount must be greater than 0"),
  deposit_amount: z.coerce.number().nonnegative().default(0),
  deposit_currency_id: z.coerce.number().int().optional().nullable(),

  // Rental details & costs
  pickup_district_id: z.coerce.number().int().optional().nullable(),
  pickup_hotel: z.string().trim().optional().nullable(),
  pickup_room: z.string().trim().optional().nullable(),
  delivery_cost: z.coerce.number().nonnegative().default(0),
  
  return_district_id: z.coerce.number().int().optional().nullable(),
  return_hotel: z.string().trim().optional().nullable(),
  return_room: z.string().trim().optional().nullable(),
  return_cost: z.coerce.number().nonnegative().default(0),

  // Car status details
  fuel_level: z.string().trim().default("Full"),
  cleanliness: z.string().trim().default("Clean"),
  start_mileage: z.coerce.number().nonnegative().default(0),
  
  // Extra flags (passed as hidden fields)
  fullInsurance: z.preprocess((v) => v === "true", z.boolean()),
  deliveryFeeAfterHours: z.preprocess((v) => v === "true", z.boolean()),
  babySeat: z.preprocess((v) => v === "true", z.boolean()),
  islandTrip: z.preprocess((v) => v === "true", z.boolean()),
  krabiTrip: z.preprocess((v) => v === "true", z.boolean()),

  notes: z.string().trim().optional().nullable(),
  
  // JSON arrays of photos (base64 or URLs)
  passportPhotos: z.string().optional().default("[]"),
  driverLicensePhotos: z.string().optional().default("[]"),
  photos: z.string().optional().default("[]"),
}).refine((data) => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return start < end;
}, {
  message: "End date must be after start date",
  path: ["end_date"],
});

export type CreateContractFormData = z.infer<typeof createContractFormSchema>;

export const editContractFormSchema = z.object({
  // Car identification
  company_car_id: z.coerce.number().int().positive().optional(),
  
  // Client details
  client_passport: z.string().trim().optional(),
  client_name: z.string().trim().min(2, "Client name is required").optional(),
  client_surname: z.string().trim().min(2, "Client surname is required").optional(),
  client_phone: z.string().trim().min(5, "Client phone is required").optional(),
  client_email: z.string().trim().email("Invalid email").optional().or(z.literal("")),
  client_whatsapp: z.string().trim().optional(),
  client_telegram: z.string().trim().optional(),

  // Dates
  start_date: z.string().trim().min(1, "Start date is required").optional(),
  end_date: z.string().trim().min(1, "End date is required").optional(),

  // Financial details
  currency_id: z.coerce.number().int().positive().default(1).optional(),
  total_amount: z.coerce.number().nonnegative().default(0),
  deposit_amount: z.coerce.number().nonnegative().default(0),
  deposit_currency_id: z.coerce.number().int().optional().nullable(),

  // Rental details & costs
  pickup_district_id: z.coerce.number().int().optional().nullable(),
  pickup_hotel: z.string().trim().optional().nullable(),
  pickup_room: z.string().trim().optional().nullable(),
  delivery_cost: z.coerce.number().nonnegative().default(0),
  
  return_district_id: z.coerce.number().int().optional().nullable(),
  return_hotel: z.string().trim().optional().nullable(),
  return_room: z.string().trim().optional().nullable(),
  return_cost: z.coerce.number().nonnegative().default(0),

  // Car status details
  fuel_level: z.string().trim().optional().nullable(),
  cleanliness: z.string().trim().optional().nullable(),
  start_mileage: z.coerce.number().nonnegative().default(0),
  
  // Extra flags
  fullInsurance: z.preprocess((v) => v === "true", z.boolean()),
  deliveryFeeAfterHours: z.preprocess((v) => v === "true", z.boolean()),
  babySeat: z.preprocess((v) => v === "true", z.boolean()),
  islandTrip: z.preprocess((v) => v === "true", z.boolean()),
  krabiTrip: z.preprocess((v) => v === "true", z.boolean()),

  notes: z.string().trim().optional().nullable(),
  
  // JSON arrays of photos
  passportPhotos: z.string().optional().default("[]"),
  driverLicensePhotos: z.string().optional().default("[]"),
  photos: z.string().optional().default("[]"),
});

export type EditContractFormData = z.infer<typeof editContractFormSchema>;
