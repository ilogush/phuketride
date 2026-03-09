import { getRequestMetadata } from "~/lib/audit-logger";
import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
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
import StatCard from '~/components/shared/ui/StatCard';
import DataTable, { type Column } from "~/components/dashboard/data-table/DataTable";
import IdBadge from "~/components/shared/ui/IdBadge";
import StatusBadge from "~/components/shared/ui/StatusBadge";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { parseWithSchema } from "~/lib/validation.server";
import { dashboardTaskDeleteSchema } from "~/schemas/admin-analytics";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

import { getScopedDb } from "~/lib/db-factory.server";

export const meta: MetaFunction = () => [
    { title: "Dashboard — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    return trackServerOperation({
        event: "dashboard-home.action",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "dashboard-home" },
        run: async () => {
            const formData = await request.formData();
            const result = parseWithSchema(dashboardTaskDeleteSchema, formData);
            if (!result.ok) {
                return redirectWithRequestError(request, "/home", result.error);
            }

            await sdb.dashboard.deleteTask(result.data.taskId);

            await sdb.auditLogs.quickAudit({
                userId: user.id,
                role: user.role,
                companyId,
                entityType: "task",
                entityId: result.data.taskId,
                action: "delete",
                ...getRequestMetadata(request),
            });

            return redirectWithRequestSuccess(request, "/home", "Task deleted successfully");
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
    const { user, companyId, sdb } = await getScopedDb(request, context);
    return trackServerOperation({
        event: "dashboard-home.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "dashboard-home", role: user.role },
        run: () => sdb.dashboard.getMainData({ id: user.id, role: user.role }),
    });
}

export default function Index() {
    const { statCards, tasks } = useLoaderData<typeof loader>();
    const taskColumns: Column<(typeof tasks)[number]>[] = [
        {
            key: "id",
            label: "ID",
            render: (task) => {
                return (
                    <Link to={`/calendar/edit/${task.id}`}>
                        <IdBadge>{String(task.id)}</IdBadge>
                    </Link>
                );
            },
        },
        { key: "title", label: "Title" },
        {
            key: "description",
            label: "Description",
            wrap: true,
            className: "min-w-[18rem]",
        },
        {
            key: "status",
            label: "Status",
            render: (task) => <StatusBadge variant={task.status === "completed" ? "success" : task.status === "in_progress" ? "info" : "warning"}>{task.status.replace("_", " ")}</StatusBadge>,
        },
        {
            key: "priority",
            label: "Priority",
            render: (task) => task.priority ? <StatusBadge variant={task.priority === "high" ? "error" : task.priority === "medium" ? "warning" : "neutral"}>{task.priority}</StatusBadge> : "-",
        },
    ];

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

            {tasks && tasks.length > 0 && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <DataTable
                        data={tasks}
                        columns={taskColumns}
                        pagination={false}
                        emptyTitle="No tasks"
                        emptyDescription="No active tasks found"
                    />
                </div>
            )}
        </div>
    );
}
