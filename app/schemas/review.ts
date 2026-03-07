import { z } from "zod";

export const contractReviewSchema = z.object({
    reviewText: z.string().trim().min(10, "Review text must be at least 10 characters"),
    rating: z.coerce.number().int().min(1).max(5).default(5),
    cleanliness: z.coerce.number().int().min(1).max(5).default(5),
    maintenance: z.coerce.number().int().min(1).max(5).default(5),
    communication: z.coerce.number().int().min(1).max(5).default(5),
    convenience: z.coerce.number().int().min(1).max(5).default(5),
    accuracy: z.coerce.number().int().min(1).max(5).default(5),
});
