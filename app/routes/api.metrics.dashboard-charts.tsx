import { type LoaderFunctionArgs } from "react-router";
import { loadDashboardChartsData } from "~/lib/admin-analytics.server";
import { trackServerOperation } from "~/lib/telemetry.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    try {
        const { user, companyId } = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
        return await trackServerOperation({
            event: "metrics.dashboard_charts.load",
            scope: "route.loader",
            request,
            userId: user.id,
            companyId,
            details: { route: "api.metrics.dashboard-charts" },
            run: async () => {
                const data = await loadDashboardChartsData({
                    db: context.cloudflare.env.DB,
                    companyId,
                });

                return Response.json({
                    success: true,
                    data,
                });
            },
        });
    } catch (error) {
        if (error instanceof Response) {
            return Response.json({
                success: false,
                error: error.status === 403 ? "Forbidden" : "Failed to load dashboard charts",
            }, { status: error.status });
        }

        return Response.json({
            success: false,
            error: "Failed to load dashboard charts"
        }, { status: 500 });
    }
}
