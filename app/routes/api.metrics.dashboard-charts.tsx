import { type LoaderFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { and, gte, eq, sql } from "drizzle-orm";
import { contracts } from "~/db/schema";

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        const user = await requireAuth(request);
        const db = drizzle(context.cloudflare.env.DB);

        // Activity by day (last 7 days) - count contracts created per day
        const activityByDay = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateStr = date.toISOString().split('T')[0];

            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);

            const [result] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .where(
                    and(
                        gte(contracts.createdAt, date),
                        sql`${contracts.createdAt} < ${nextDate}`
                    )
                );

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
        const [activeResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(contracts)
            .where(sql`status = 'active'`);

        const [closedResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(contracts)
            .where(eq(contracts.status, "closed"));

        const [closedTodayResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(contracts)
            .where(
                and(
                    eq(contracts.status, "closed"),
                    gte(contracts.updatedAt, new Date(new Date().setHours(0, 0, 0, 0)))
                )
            );

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
    } catch (error) {
        console.error("Error loading dashboard charts:", error);
        return Response.json({
            success: false,
            error: "Failed to load dashboard charts"
        }, { status: 500 });
    }
}
