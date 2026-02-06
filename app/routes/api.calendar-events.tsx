import { type LoaderFunctionArgs, json } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { and, gte, lte, eq } from "drizzle-orm";
import { contracts, calendarEvents } from "~/db/schema";

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        const user = await requireAuth(request);
        const db = drizzle(context.cloudflare.env.DB);

        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get("limit") || "5");
        const companyId = url.searchParams.get("companyId");

        const events: any[] = [];
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 30);

        // Get upcoming contract end dates
        const upcomingContracts = await db
            .select({
                id: contracts.id,
                endDate: contracts.endDate,
                status: contracts.status
            })
            .from(contracts)
            .where(
                and(
                    gte(contracts.endDate, today.getTime()),
                    lte(contracts.endDate, futureDate.getTime())
                )
            )
            .limit(limit);

        upcomingContracts.forEach((contract) => {
            const eventDate = new Date(contract.endDate);
            const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let status: 'upcoming' | 'today' | 'overdue' = 'upcoming';
            if (diffDays === 0) status = 'today';
            else if (diffDays < 0) status = 'overdue';

            events.push({
                id: contract.id,
                title: `Contract #${contract.id} ends`,
                type: 'contract',
                date: new Date(contract.endDate).toISOString(),
                status
            });
        });

        // Get calendar events
        let eventsQuery = db
            .select({
                id: calendarEvents.id,
                title: calendarEvents.title,
                startDate: calendarEvents.startDate,
                eventType: calendarEvents.eventType
            })
            .from(calendarEvents)
            .where(
                and(
                    gte(calendarEvents.startDate, today.getTime()),
                    lte(calendarEvents.startDate, futureDate.getTime())
                )
            );

        if (companyId) {
            eventsQuery = eventsQuery.where(eq(calendarEvents.companyId, parseInt(companyId)));
        }

        const calendarEventsData = await eventsQuery.limit(limit);

        calendarEventsData.forEach((event) => {
            const eventDate = new Date(event.startDate);
            const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

            let status: 'upcoming' | 'today' | 'overdue' = 'upcoming';
            if (diffDays === 0) status = 'today';
            else if (diffDays < 0) status = 'overdue';

            events.push({
                id: event.id,
                title: event.title,
                type: event.eventType,
                date: new Date(event.startDate).toISOString(),
                status
            });
        });

        // Sort by date
        events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return json({
            success: true,
            data: events.slice(0, limit)
        });
    } catch (error) {
        console.error("Error loading calendar events:", error);
        return json({
            success: false,
            error: "Failed to load calendar events",
            data: []
        }, { status: 500 });
    }
}
