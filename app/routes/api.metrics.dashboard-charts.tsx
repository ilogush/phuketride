import { type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        await requireAuth(request);
        const d1 = context.cloudflare.env.DB;

        // Activity by day (last 7 days) - count contracts created per day
        const activityByDay = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split('T')[0];

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const result = await d1
                .prepare("SELECT count(*) AS count FROM contracts WHERE created_at >= ? AND created_at < ?")
                .bind(date.getTime(), nextDate.getTime())
                .first<{ count: number }>();

            activityByDay.push({
                date: dateStr,
                count: result?.count || 0
            });
        }

        // Companies by location
        const companiesByLocationRaw = await context.cloudflare.env.DB
            .prepare(`
                SELECT l.name as location, COUNT(DISTINCT c.id) as count
                FROM companies c
                LEFT JOIN locations l ON c.location_id = l.id
                GROUP BY l.name
                LIMIT 5
            `)
            .all();

        const companiesByLocation = companiesByLocationRaw.results as Array<{ location: string; count: number }>;

        // Contract stats
        const activeResult = await d1
            .prepare("SELECT count(*) AS count FROM contracts WHERE status = 'active'")
            .first<{ count: number }>();
        const closedResult = await d1
            .prepare("SELECT count(*) AS count FROM contracts WHERE status = 'closed'")
            .first<{ count: number }>();
        const closedTodayResult = await d1
            .prepare("SELECT count(*) AS count FROM contracts WHERE status = 'closed' AND updated_at >= ?")
            .bind(new Date(new Date().setHours(0, 0, 0, 0)).getTime())
            .first<{ count: number }>();

        const contractStats = {
            active: activeResult?.count || 0,
            closed: closedResult?.count || 0,
            closedToday: closedTodayResult?.count || 0
        };

        return Response.json({
            success: true,
            data: {
                activityByDay,
                companiesByLocation: companiesByLocation.map(item => ({
                    location: item.location || 'Unknown',
                    count: item.count
                })),
                contractStats
            }
        });
    } catch {
        return Response.json({
            success: false,
            error: "Failed to load dashboard charts"
        }, { status: 500 });
    }
}
