interface CreateEventParams {
    db: D1Database;
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
        const insertResult = await db
            .prepare(
                `
                INSERT INTO calendar_events (
                    company_id, event_type, title, description,
                    start_date, end_date, related_id, color,
                    status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                `
            )
            .bind(
                companyId,
                eventType,
                title,
                description || null,
                startDate.getTime(),
                endDate ? endDate.getTime() : null,
                relatedId || null,
                color,
                createdBy
            )
            .run();

        return { id: Number(insertResult.meta.last_row_id) };
    } catch {
        return null;
    }
}

export async function createContractEvents(params: {
    db: D1Database;
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
    db: D1Database;
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
