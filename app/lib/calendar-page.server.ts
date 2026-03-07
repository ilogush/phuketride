import { getFutureWindow, getMonthWindow, getRelativeDayStatus, parseDisplayDateTimeToDate, toDateFromUnknown, toIsoWindow } from "~/lib/date-windows";
import { createCalendarEvent } from "~/lib/calendar-events.server";
import { listCalendarMonthSnapshot, listUpcomingCalendarContracts, listUpcomingCalendarEvents } from "~/lib/calendar-repo.server";
import { calendarApiQuerySchema, calendarEventSchema } from "~/schemas/calendar";
import { parseWithSchema } from "~/lib/validation.server";

export type CalendarListEvent = { id: number; title: string; startDate: string | number; color?: string | null };
export type CalendarListContract = { id: number; endDate: string | number };
export type CalendarListBooking = { id: number; startDate: string | number };
export type CalendarEventStatus = "upcoming" | "today" | "overdue";
export type CalendarFeedItem = { id: number; title: string; type: string; date: string; status: CalendarEventStatus };

export function resolveCalendarMonthParams(url: URL, now = new Date()) {
    const rawMonth = Number.parseInt(url.searchParams.get("month") || "", 10);
    const rawYear = Number.parseInt(url.searchParams.get("year") || "", 10);
    const currentMonth = Number.isInteger(rawMonth) && rawMonth >= 0 && rawMonth <= 11 ? rawMonth : now.getMonth();
    const currentYear = Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : now.getFullYear();
    return { currentMonth, currentYear };
}

export async function loadCalendarPageData(args: {
    db: D1Database;
    companyId: number;
    url: URL;
}) {
    const { currentMonth, currentYear } = resolveCalendarMonthParams(args.url);
    const { start, end } = getMonthWindow(currentYear, currentMonth);
    const { startIso, endIso } = toIsoWindow({ start, end });
    const snapshot = await listCalendarMonthSnapshot({
        db: args.db,
        companyId: args.companyId,
        startIso,
        endIso,
    });

    return {
        ...snapshot,
        currentMonth,
        currentYear,
    };
}

export async function createCalendarEventFromForm(args: {
    db: D1Database;
    companyId: number;
    createdBy: string;
    formData: FormData;
}) {
    const parsed = parseWithSchema(calendarEventSchema, {
        title: args.formData.get("title"),
        description: args.formData.get("description"),
        eventType: args.formData.get("eventType"),
        startDate: args.formData.get("startDate"),
        endDate: args.formData.get("endDate"),
        color: args.formData.get("color"),
    });
    if (!parsed.ok) {
        return { ok: false as const, error: parsed.error };
    }

    const startDate = parseDisplayDateTimeToDate(parsed.data.startDate);
    const endDate = parsed.data.endDate ? parseDisplayDateTimeToDate(parsed.data.endDate) : undefined;
    if (endDate && endDate < startDate) {
        return { ok: false as const, error: "End date must be after start date" };
    }

    const created = await createCalendarEvent({
        db: args.db,
        companyId: args.companyId,
        eventType: parsed.data.eventType,
        title: parsed.data.title,
        description: parsed.data.description || undefined,
        startDate,
        endDate,
        color: parsed.data.color || "#3B82F6",
        createdBy: args.createdBy,
    });
    if (!created) {
        return { ok: false as const, error: "Failed to create event" };
    }

    return { ok: true as const, data: created };
}

export async function loadUpcomingCalendarFeed(args: {
    db: D1Database;
    companyId: number;
    url: URL;
    now?: Date;
}) {
    const parsed = parseWithSchema(calendarApiQuerySchema, {
        limit: args.url.searchParams.get("limit") || "5",
    });
    if (!parsed.ok) {
        return { ok: false as const, error: parsed.error };
    }

    const now = args.now ?? new Date();
    const { startIso, endIso } = toIsoWindow(getFutureWindow(30, now));
    const [contracts, events] = await Promise.all([
        listUpcomingCalendarContracts({
            db: args.db,
            companyId: args.companyId,
            startIso,
            endIso,
            limit: parsed.data.limit,
        }),
        listUpcomingCalendarEvents({
            db: args.db,
            companyId: args.companyId,
            startIso,
            endIso,
            limit: parsed.data.limit,
        }),
    ]);

    const items: CalendarFeedItem[] = [];

    for (const contract of contracts) {
        const eventDate = toDateFromUnknown(contract.endDate);
        if (!eventDate) continue;
        items.push({
            id: contract.id,
            title: `Contract #${String(contract.id)} ends`,
            type: "contract",
            date: eventDate.toISOString(),
            status: getRelativeDayStatus(eventDate, now),
        });
    }

    for (const event of events) {
        const eventDate = toDateFromUnknown(event.startDate);
        if (!eventDate) continue;
        items.push({
            id: event.id,
            title: String(event.title || ""),
            type: String(event.eventType || "other"),
            date: eventDate.toISOString(),
            status: getRelativeDayStatus(eventDate, now),
        });
    }

    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
        ok: true as const,
        data: items.slice(0, parsed.data.limit),
        limit: parsed.data.limit,
    };
}
