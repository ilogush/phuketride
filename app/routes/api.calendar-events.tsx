import { type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { getFutureWindow, getRelativeDayStatus, toDateFromUnknown, toIsoWindow } from "~/lib/date-windows";

type CalendarEventStatus = 'upcoming' | 'today' | 'overdue';

interface UpcomingContractRow {
    id: number;
    endDate: string | number;
    status: string;
}

interface CalendarEventRow {
    id: number;
    title: string | null;
    startDate: string | number;
    eventType: string;
}

interface EventItem {
    id: number;
    title: string;
    type: string;
    date: string;
    status: CalendarEventStatus;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        const user = await requireAuth(request);
        const d1 = context.cloudflare.env.DB;

        const url = new URL(request.url);
        const rawLimit = parseInt(url.searchParams.get("limit") || "5", 10);
        const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 50) : 5;
        const companyId = url.searchParams.get("companyId");
        const parsedCompanyId = companyId ? parseInt(companyId, 10) : null;

        const events: EventItem[] = [];
        const today = new Date();
        const { startIso: todayIso, endIso: futureDateIso } = toIsoWindow(getFutureWindow(30, today));

        // Get upcoming contract end dates with proper access scoping.
        let contractsQuery = `
            SELECT c.id, c.end_date AS endDate, c.status
            FROM contracts c
        `;
        const contractBindings: Array<string | number> = [todayIso, futureDateIso];
        if (Number.isFinite(parsedCompanyId) && parsedCompanyId !== null) {
            contractsQuery += " JOIN company_cars cc ON cc.id = c.company_car_id WHERE c.end_date >= ? AND c.end_date <= ? AND cc.company_id = ?";
            contractBindings.push(parsedCompanyId);
        } else if (user.companyId) {
            contractsQuery += " JOIN company_cars cc ON cc.id = c.company_car_id WHERE c.end_date >= ? AND c.end_date <= ? AND cc.company_id = ?";
            contractBindings.push(user.companyId);
        } else if (user.role === "user") {
            contractsQuery += " WHERE c.end_date >= ? AND c.end_date <= ? AND c.client_id = ?";
            contractBindings.push(user.id);
        } else {
            contractsQuery += " WHERE c.end_date >= ? AND c.end_date <= ?";
        }
        contractsQuery += " ORDER BY c.end_date ASC LIMIT ?";
        contractBindings.push(limit);

        const upcomingContractsResult = await d1
            .prepare(contractsQuery)
            .bind(...contractBindings)
            .all() as { results?: UpcomingContractRow[] };
        const upcomingContracts = upcomingContractsResult.results ?? [];

        upcomingContracts.forEach((contract: UpcomingContractRow) => {
            const eventDate = toDateFromUnknown(contract.endDate);
            if (!eventDate) return;
            const status = getRelativeDayStatus(eventDate, today) as CalendarEventStatus;

            events.push({
                id: contract.id,
                title: `Contract #${String(contract.id)} ends`,
                type: 'contract',
                date: eventDate.toISOString(),
                status
            });
        });

        // Get calendar events
        let calendarEventsQuery = `
            SELECT id, title, start_date AS startDate, event_type AS eventType
            FROM calendar_events
            WHERE start_date >= ? AND start_date <= ?
        `;
        const bindings: Array<string | number> = [todayIso, futureDateIso];
        if (companyId) {
            calendarEventsQuery += " AND company_id = ?";
            bindings.push(parseInt(companyId, 10));
        } else if (user.companyId) {
            calendarEventsQuery += " AND company_id = ?";
            bindings.push(user.companyId);
        }
        calendarEventsQuery += " LIMIT ?";
        bindings.push(limit);

        const calendarEventsDataResult = await d1
            .prepare(calendarEventsQuery)
            .bind(...bindings)
            .all() as { results?: CalendarEventRow[] };
        const calendarEventsData = calendarEventsDataResult.results ?? [];

        calendarEventsData.forEach((event: CalendarEventRow) => {
            const eventDate = toDateFromUnknown(event.startDate);
            if (!eventDate) return;
            const status = getRelativeDayStatus(eventDate, today) as CalendarEventStatus;

            events.push({
                id: event.id,
                title: String(event.title || ""),
                type: event.eventType,
                date: eventDate.toISOString(),
                status
            });
        });

        // Sort by date
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return Response.json({
            success: true,
            data: events.slice(0, limit)
        });
    } catch (error) {
        return Response.json({
            success: false,
            error: "Failed to load calendar events",
            data: []
        }, { status: 500 });
    }
}
