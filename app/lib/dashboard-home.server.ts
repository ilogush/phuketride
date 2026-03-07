import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import { loadDashboardHomeData } from "~/lib/dashboard-metrics.server";
import type { SessionUser } from "~/lib/auth.server";

export interface DashboardHomePageData {
    user: SessionUser;
    statCards: Awaited<ReturnType<typeof loadDashboardHomeData>>["statCards"];
    tasks: Awaited<ReturnType<typeof loadDashboardHomeData>>["tasks"];
}

export async function loadDashboardHomePageData(args: {
    request: Request;
    db: D1Database;
}): Promise<DashboardHomePageData> {
    const { user, companyId } = await requireScopedDashboardAccess(args.request, { allowAdminGlobal: true });

    try {
        return {
            user,
            ...(await loadDashboardHomeData({
                db: args.db,
                user: {
                    id: user.id,
                    role: user.role,
                },
                effectiveCompanyId: companyId,
            })),
        };
    } catch {
        return {
            user,
            statCards: [],
            tasks: [],
        };
    }
}
