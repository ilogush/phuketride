import { type LoaderFunctionArgs, json } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { sql } from "drizzle-orm";
import { contracts, companies, locations } from "~/db/schema";

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
                        sql`${contracts.createdAt} < ${nextDate.getTime()}`
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

        const [completedResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(contracts)
            .where(sql`status = 'completed'`);

        const [pendingResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(contracts)
            .where(sql`status = 'pending'`);

        const contractStats = {
            active: activeResult?.count || 0,
            completed: completedResult?.count || 0,
            pending: pendingResult?.count || 0
        };

        return json({
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
        return json({
            success: false,
            error: "Failed to load dashboard charts"
        }, { status: 500 });
    }
}
