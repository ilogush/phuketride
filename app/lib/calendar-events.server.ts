import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";

interface CreateEventParams {
    db: ReturnType<typeof drizzle>;
    companyId: number;
    eventType: "contract" | "booking" | "payment_due" | "maintenance" | "document_expiry" | "delivery" | "pickup" | "other";
    title: string;
    description?: string;
    startDate: Date;
    endDate?: Date;
    relatedId?: number;
    color?: string;
    createdBy: string;
}

export async function createCalendarEvent(params: CreateEventParams) {
    const {
        db,
        companyId,
        eventType,
        title,
        description,
        startDate,
        endDate,
        relatedId,
        color = "#3B82F6",
        createdBy,
    } = params;

    try {
        const [event] = await db.insert(schema.calendarEvents).values({
            companyId,
            eventType,
            title,
            description,
            startDate,
            endDate,
            relatedId,
            color,
            status: "pending",
            createdBy,
        }).returning({ id: schema.calendarEvents.id });

        return event;
    } catch (error) {
        console.error("Failed to create calendar event:", error);
        return null;
    }
}

export async function createContractEvents(params: {
    db: ReturnType<typeof drizzle>;
    companyId: number;
    contractId: number;
    startDate: Date;
    endDate: Date;
    createdBy: string;
}) {
    const { db, companyId, contractId, startDate, endDate, createdBy } = params;

    // Create pickup event
    await createCalendarEvent({
        db,
        companyId,
        eventType: "pickup",
        title: `Contract #${contractId} - Pickup`,
        description: `Car pickup for contract #${contractId}`,
        startDate,
        relatedId: contractId,
        color: "#10B981",
        createdBy,
    });

    // Create return event
    await createCalendarEvent({
        db,
        companyId,
        eventType: "contract",
        title: `Contract #${contractId} - Return`,
        description: `Car return for contract #${contractId}`,
        startDate: endDate,
        relatedId: contractId,
        color: "#EF4444",
        createdBy,
    });
}

export async function createBookingEvents(params: {
    db: ReturnType<typeof drizzle>;
    companyId: number;
    bookingId: number;
    startDate: Date;
    endDate: Date;
    createdBy: string;
}) {
    const { db, companyId, bookingId, startDate, endDate, createdBy } = params;

    // Create booking start event
    await createCalendarEvent({
        db,
        companyId,
        eventType: "booking",
        title: `Booking #${bookingId} - Start`,
        description: `Booking #${bookingId} starts`,
        startDate,
        relatedId: bookingId,
        color: "#3B82F6",
        createdBy,
    });

    // Create booking end event
    await createCalendarEvent({
        db,
        companyId,
        eventType: "booking",
        title: `Booking #${bookingId} - End`,
        description: `Booking #${bookingId} ends`,
        startDate: endDate,
        relatedId: bookingId,
        color: "#8B5CF6",
        createdBy,
    });
}
