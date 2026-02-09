import { z } from "zod";

export const contractSchema = z.object({
    companyCarId: z.number().int().positive("Car is required"),
    clientId: z.string().uuid("Invalid client ID"),
    managerId: z.string().uuid("Invalid manager ID").optional().nullable(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    totalDays: z.number().int().min(1, "Total days must be at least 1"),
    pricePerDay: z.number().min(0, "Price per day must be positive"),
    totalPrice: z.number().min(0, "Total price must be positive"),
    deposit: z.number().min(0, "Deposit must be positive"),
    currency: z.string().length(3, "Currency must be 3 characters").default("THB"),
    // Client details
    clientName: z.string().min(1, "Client name is required").max(100, "Client name is too long"),
    clientSurname: z.string().min(1, "Client surname is required").max(100, "Client surname is too long"),
    clientPhone: z.string().min(9, "Phone must contain at least 9 digits").max(20, "Phone is too long"),
    clientEmail: z.string().email("Invalid email format").optional().nullable(),
    clientPassport: z.string().max(50, "Passport number is too long").optional().nullable(),
    clientCitizenship: z.string().max(100, "Citizenship is too long").optional().nullable(),
    // Delivery
    deliveryLocationId: z.number().int().positive("Delivery location is required").optional().nullable(),
    deliveryDistrictId: z.number().int().positive("Delivery district is required").optional().nullable(),
    deliveryAddress: z.string().max(500, "Delivery address is too long").optional().nullable(),
    deliveryTime: z.string().optional().nullable(),
    deliveryFee: z.number().min(0, "Delivery fee must be positive").optional(),
    // Return
    returnLocationId: z.number().int().positive("Return location is required").optional().nullable(),
    returnDistrictId: z.number().int().positive("Return district is required").optional().nullable(),
    returnAddress: z.string().max(500, "Return address is too long").optional().nullable(),
    returnTime: z.string().optional().nullable(),
    returnFee: z.number().min(0, "Return fee must be positive").optional(),
    // Car condition
    fuelLevelStart: z.string().max(10, "Fuel level is too long").optional(),
    fuelLevelEnd: z.string().max(10, "Fuel level is too long").optional(),
    mileageStart: z.number().int().min(0, "Mileage must be positive").optional(),
    mileageEnd: z.number().int().min(0, "Mileage must be positive").optional(),
    cleanliness: z.enum(["clean", "dirty", "very_dirty"], { errorMap: () => ({ message: "Invalid cleanliness" }) }).optional(),
    // Additional services
    fullInsurance: z.boolean().optional(),
    fullInsurancePrice: z.number().min(0, "Insurance price must be positive").optional(),
    islandTrip: z.boolean().optional(),
    islandTripPrice: z.number().min(0, "Island trip price must be positive").optional(),
    krabiTrip: z.boolean().optional(),
    krabiTripPrice: z.number().min(0, "Krabi trip price must be positive").optional(),
    babySeat: z.boolean().optional(),
    babySeatPrice: z.number().min(0, "Baby seat price must be positive").optional(),
    // Status
    status: z.enum(["active", "completed", "cancelled"], { errorMap: () => ({ message: "Invalid status" }) }).default("active"),
    notes: z.string().max(1000, "Notes are too long").optional().nullable(),
}).refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
});

export type ContractFormData = z.infer<typeof contractSchema>;
