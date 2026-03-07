import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import {
    BuildingOfficeIcon,
    UserGroupIcon,
    TruckIcon,
    ClipboardDocumentListIcon,
    BanknotesIcon,
    CheckCircleIcon,
    CalendarIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";
import StatCard from "~/components/dashboard/StatCard";
import TasksWidget from "~/components/dashboard/TasksWidget";
import { useUrlToast } from "~/lib/useUrlToast";
import { loadDashboardHomePageData } from "~/lib/dashboard-home.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { parseWithSchema } from "~/lib/validation.server";
import { deleteDashboardTaskFromForm } from "~/lib/admin-analytics.server";
import { dashboardTaskDeleteSchema } from "~/schemas/admin-analytics";
import { redirectWithRequestError } from "~/lib/route-feedback";

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    return trackServerOperation({
        event: "dashboard-home.action",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "dashboard-home" },
        run: async () => {
            const formData = await request.formData();
            const parsed = parseWithSchema(dashboardTaskDeleteSchema, {
                intent: formData.get("intent"),
                taskId: formData.get("taskId"),
            });
            if (!parsed.ok) {
                return redirectWithRequestError(request, "/home", parsed.error);
            }

            return deleteDashboardTaskFromForm({
                db: context.cloudflare.env.DB,
                request,
                companyId,
                taskId: parsed.data.taskId,
            });
        },
    });
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_MAP: Record<string, IconComponent> = {
    BuildingOfficeIcon,
    UserGroupIcon,
    TruckIcon,
    ClipboardDocumentListIcon,
    BanknotesIcon,
    CheckCircleIcon,
    CalendarIcon,
    ClockIcon,
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request, { allowAdminGlobal: true });
    return trackServerOperation({
        event: "dashboard-home.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "dashboard-home", role: user.role },
        run: () => loadDashboardHomePageData({
            request,
            db: context.cloudflare.env.DB,
        }),
    });
}

export default function Index() {
    const { statCards, tasks } = useLoaderData<typeof loader>();
    useUrlToast();

    return (
        <div className="space-y-4">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {statCards && statCards.length > 0 ? (
                    statCards.map((stat) => {
                        const Icon = ICON_MAP[stat.icon] || BuildingOfficeIcon;
                        return (
                            <StatCard
                                key={stat.name}
                                name={stat.name}
                                value={stat.value}
                                subtext={stat.subtext}
                                icon={<Icon className="h-6 w-6 stroke-2" />}
                                href={stat.href}
                            />
                        );
                    })
                ) : (
                    <div className="col-span-full py-20 text-center">
                        <p className="text-gray-400 font-medium">No system statistics available at the moment.</p>
                    </div>
                )}
            </div>

            {/* Tasks Widget */}
            {tasks && tasks.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <TasksWidget tasks={tasks} />
                </div>
            )}
        </div>
    );
}
