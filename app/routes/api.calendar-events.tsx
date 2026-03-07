import { type LoaderFunctionArgs } from "react-router";
import { loadUpcomingCalendarFeed } from "~/lib/calendar-page.server";
import { trackServerOperation } from "~/lib/telemetry.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        const { user, companyId } = await requireScopedDashboardAccess(request);
        if (companyId === null) {
            throw new Response("Forbidden", { status: 403 });
        }
        return await trackServerOperation({
            event: "calendar.api.load",
            scope: "route.loader",
            request,
            userId: user.id,
            companyId,
            details: { route: "api.calendar-events" },
            run: async () => {
                const result = await loadUpcomingCalendarFeed({
                    db: context.cloudflare.env.DB,
                    companyId,
                    url: new URL(request.url),
                });
                if (!result.ok) {
                    return Response.json({
                        success: false,
                        error: result.error,
                        data: [],
                    }, { status: 400 });
                }

                return Response.json({
                    success: true,
                    data: result.data,
                });
            },
        });
    } catch (error) {
        return Response.json({
            success: false,
            error: "Failed to load calendar events",
            data: []
        }, { status: 500 });
    }
}
