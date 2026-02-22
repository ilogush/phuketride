import { type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        const user = await requireAuth(request);
        const d1 = context.cloudflare.env.DB;

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get("limit") || "5");
        const companyId = url.searchParams.get("companyId");

        const events: any[] = [];
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);

        // Get upcoming contract end dates
        const upcomingContractsResult = await d1
            .prepare(
                `
                SELECT id, end_date AS endDate, status
                FROM contracts
                WHERE end_date >= ? AND end_date <= ?
                LIMIT ?
                `
            )
            .bind(today.getTime(), futureDate.getTime(), limit)
            .all();
        const upcomingContracts = (upcomingContractsResult.results ?? []) as Array<Record<string, unknown>>;

        upcomingContracts.forEach((contract) => {
            const eventDate = new Date(Number(contract.endDate));
            const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let status: 'upcoming' | 'today' | 'overdue' = 'upcoming';
            if (diffDays === 0) status = 'today';
            else if (diffDays < 0) status = 'overdue';

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
        const bindings: Array<string | number> = [today.getTime(), futureDate.getTime()];
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
            .all();
        const calendarEventsData = (calendarEventsDataResult.results ?? []) as Array<Record<string, unknown>>;

        calendarEventsData.forEach((event) => {
            const eventDate = new Date(Number(event.startDate));
            const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let status: 'upcoming' | 'today' | 'overdue' = 'upcoming';
            if (diffDays === 0) status = 'today';
            else if (diffDays < 0) status = 'overdue';

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
