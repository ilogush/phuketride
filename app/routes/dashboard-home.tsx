import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
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
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import {
    loadDashboardHomeData,
} from "~/lib/dashboard-metrics.server";

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    return trackServerOperation({
        event: "dashboard-home.action",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: user.companyId ?? null,
        details: { route: "dashboard-home" },
        run: async () => {
            const formData = await request.formData();
            const parsed = parseWithSchema(
                z
                .object({
                    taskId: z.coerce.number().int().positive().optional(),
                    intent: z.enum(["delete"]).optional(),
                }),
                {
                    taskId: formData.get("taskId"),
                    intent: formData.get("intent"),
                },
                "Invalid action"
            );
            if (!parsed.ok) {
                return redirect("/home?error=Invalid action");
            }
            const taskId = parsed.data.taskId;
            const intent = parsed.data.intent;

            if (intent === "delete" && taskId) {
                try {
                    await context.cloudflare.env.DB
                        .prepare("DELETE FROM calendar_events WHERE id = ?")
                        .bind(taskId)
                        .run();

                    return redirect("/home?success=Task deleted successfully");
                } catch {
                    return redirect("/home?error=Failed to delete task");
                }
            }

            return redirect("/home");
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
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);
    return trackServerOperation({
        event: "dashboard-home.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: effectiveCompanyId,
        details: { route: "dashboard-home", role: user.role },
        run: async () => {
            try {
                return {
                    user,
                    ...(await loadDashboardHomeData({
                        db: context.cloudflare.env.DB,
                        user: {
                            id: user.id,
                            role: user.role,
                        },
                        effectiveCompanyId,
                    })),
                };
            } catch {
                return { user, statCards: [], tasks: [] };
            }
        },
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
