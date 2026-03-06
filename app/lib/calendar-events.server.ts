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

/**
 * Get prepared statement to create a calendar event
 */
export function getCreateCalendarEventStmt(params: CreateEventParams): D1PreparedStatement {
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

    return db
        .prepare(
            `
            INSERT INTO calendar_events (
                company_id, event_type, title, description,
                start_date, end_date, related_id, color,
                status, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
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
            createdBy,
            new Date().toISOString(),
            new Date().toISOString()
        );
}

export async function createCalendarEvent(params: CreateEventParams) {
    try {
        const insertResult = await getCreateCalendarEventStmt(params).run();
        return { id: Number(insertResult.meta.last_row_id) };
    } catch {
        return null;
    }
}

/**
 * Get prepared statements for contract events
 */
export function getCreateContractEventsStmts(params: {
    db: D1Database;
    companyId: number;
    contractId: number;
    startDate: Date;
    endDate: Date;
    createdBy: string;
}): D1PreparedStatement[] {
    const { db, companyId, contractId, startDate, endDate, createdBy } = params;

    return [
        // Pickup event
        getCreateCalendarEventStmt({
            db,
            companyId,
            eventType: "pickup",
            title: `Contract #${contractId} - Pickup`,
            description: `Car pickup for contract #${contractId}`,
            startDate,
            relatedId: contractId,
            color: "#10B981",
            createdBy,
        }),
        // Return event
        getCreateCalendarEventStmt({
            db,
            companyId,
            eventType: "contract",
            title: `Contract #${contractId} - Return`,
            description: `Car return for contract #${contractId}`,
            startDate: endDate,
            relatedId: contractId,
            color: "#EF4444",
            createdBy,
        })
    ];
}

export async function createContractEvents(params: {
    db: D1Database;
    companyId: number;
    contractId: number;
    startDate: Date;
    endDate: Date;
    createdBy: string;
}) {
    const { db } = params;
    const stmts = getCreateContractEventsStmts(params);
    await db.batch(stmts);
}

/**
 * Get prepared statements for booking events
 */
export function getCreateBookingEventsStmts(params: {
    db: D1Database;
    companyId: number;
    bookingId: number;
    startDate: Date;
    endDate: Date;
    createdBy: string;
}): D1PreparedStatement[] {
    const { db, companyId, bookingId, startDate, endDate, createdBy } = params;

    return [
        // Booking start event
        getCreateCalendarEventStmt({
            db,
            companyId,
            eventType: "booking",
            title: `Booking #${bookingId} - Start`,
            description: `Booking #${bookingId} starts`,
            startDate,
            relatedId: bookingId,
            color: "#3B82F6",
            createdBy,
        }),
        // Booking end event
        getCreateCalendarEventStmt({
            db,
            companyId,
            eventType: "booking",
            title: `Booking #${bookingId} - End`,
            description: `Booking #${bookingId} ends`,
            startDate: endDate,
            relatedId: bookingId,
            color: "#8B5CF6",
            createdBy,
        })
    ];
}

export async function createBookingEvents(params: {
    db: D1Database;
    companyId: number;
    bookingId: number;
    startDate: Date;
    endDate: Date;
    createdBy: string;
}) {
    const { db } = params;
    const stmts = getCreateBookingEventsStmts(params);
    await db.batch(stmts);
}
