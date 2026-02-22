import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
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
import StatCard from "~/components/dashboard/StatCard";
import TasksWidget from "~/components/dashboard/TasksWidget";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const taskId = formData.get("taskId") as string;
    const intent = formData.get("intent") as string;

    if (intent === "delete" && taskId) {
        try {
            // Delete calendar event (task)
            await context.cloudflare.env.DB
                .prepare("DELETE FROM calendar_events WHERE id = ?")
                .bind(parseInt(taskId))
                .run();

            return redirect("/dashboard?success=Task deleted successfully");
        } catch {
            return redirect("/dashboard?error=Failed to delete task");
        }
    }

    return redirect("/dashboard");
}

const ICON_MAP: Record<string, any> = {
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

    let statCards: any[] = [];
    let tasks: any[] = [];

    try {
        if (effectiveCompanyId) {
            // Partner/Manager/Admin(mod mode) stats for selected company
            const company = await context.cloudflare.env.DB
                .prepare("SELECT bank_name AS bankName, account_number AS accountNumber, account_name AS accountName FROM companies WHERE id = ? LIMIT 1")
                .bind(effectiveCompanyId)
                .first<any>();

            const managersCount = await context.cloudflare.env.DB
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM managers
                    WHERE company_id = ? AND is_active = 1
                `)
                .bind(effectiveCompanyId)
                .first<any>();

            const onlineUsers = 0; // Online tracking not implemented

            const carsCount = await context.cloudflare.env.DB
                .prepare("SELECT COUNT(*) AS count FROM company_cars WHERE company_id = ?")
                .bind(effectiveCompanyId)
                .first<any>();

            const contractsCount = await context.cloudflare.env.DB
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                `)
                .bind(effectiveCompanyId)
                .first<any>();

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const activeContractsCount = await context.cloudflare.env.DB
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ? AND c.created_at >= ?
                `)
                .bind(effectiveCompanyId, startOfMonth.toISOString())
                .first<any>();

            statCards = [
                {
                    name: "Users",
                    value: `${managersCount?.count || 0}/${onlineUsers}`,
                    subtext: "total / online",
                    icon: "UserGroupIcon",
                    href: "/users",
                },
                {
                    name: "Cars",
                    value: `${carsCount?.count || 0}/0`,
                    subtext: "total / in workshop",
                    icon: "TruckIcon",
                    href: "/cars",
                },
                {
                    name: "Contracts",
                    value: `${contractsCount?.count || 0}/${activeContractsCount?.count || 0}`,
                    subtext: "total / active this month",
                    icon: "ClipboardDocumentListIcon",
                    href: "/contracts",
                },
                {
                    name: "Revenue",
                    value: "฿0",
                    subtext: "this month",
                    icon: "BanknotesIcon",
                    href: "/payments",
                },
            ];

            const isCompanyIncomplete = company && (
                !company.bankName ||
                !company.accountNumber ||
                !company.accountName
            );

            const upcomingTasksResult = await context.cloudflare.env.DB
                .prepare(`
                    SELECT id, title, description, status
                    FROM calendar_events
                    WHERE company_id = ? AND status = 'pending'
                    ORDER BY start_date DESC
                    LIMIT 5
                `)
                .bind(effectiveCompanyId)
                .all() as { results?: any[] };
            const upcomingTasks = upcomingTasksResult.results || [];

            tasks = upcomingTasks.map(task => ({
                id: task.id.toString(),
                title: task.title,
                description: task.description || "",
                status: task.status as "pending" | "in_progress" | "completed",
                priority: "medium" as const,
            }));

            if (isCompanyIncomplete) {
                tasks.unshift({
                    id: "company-setup",
                    title: "Complete Company Profile",
                    description: "Please fill in your company bank details in settings to start receiving payments",
                    status: "pending" as const,
                    priority: "high" as const,
                });
            }
        } else if (user.role === "admin") {
            // Admin stats
            const [companiesCount, usersCount] = await Promise.all([
                context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM companies").first<any>(),
                context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM users").first<any>(),
            ]);

            const onlineUsers = 0; // Online tracking not implemented

            const carsCount = await context.cloudflare.env.DB
                .prepare("SELECT COUNT(*) AS count FROM company_cars")
                .first<any>();

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const contractsThisMonth = await context.cloudflare.env.DB
                .prepare("SELECT COUNT(*) AS count FROM contracts WHERE created_at >= ?")
                .bind(startOfMonth.toISOString())
                .first<any>();

            statCards = [
                {
                    name: "Users",
                    value: `${usersCount?.count || 0}/${onlineUsers}`,
                    subtext: "total / online",
                    icon: "UserGroupIcon",
                    href: "/users",
                },
                {
                    name: "Companies",
                    value: companiesCount?.count || 0,
                    subtext: "total registered",
                    icon: "BuildingOfficeIcon",
                    href: "/companies",
                },
                {
                    name: "Cars",
                    value: carsCount?.count || 0,
                    subtext: "total templates",
                    icon: "TruckIcon",
                    href: "/cars",
                },
                {
                    name: "Contracts",
                    value: contractsThisMonth?.count || 0,
                    subtext: "this month",
                    icon: "ClipboardDocumentListIcon",
                    href: "/contracts",
                },
            ];

            // Load tasks from calendar events
            const upcomingTasksResult = await context.cloudflare.env.DB
                .prepare(`
                    SELECT id, title, description, status
                    FROM calendar_events
                    WHERE status = 'pending'
                    ORDER BY start_date DESC
                    LIMIT 5
                `)
                .all() as { results?: any[] };
            const upcomingTasks = upcomingTasksResult.results || [];

            tasks = upcomingTasks.map(task => ({
                id: task.id.toString(),
                title: task.title,
                description: task.description || "",
                status: task.status as "pending" | "in_progress" | "completed",
                priority: "medium" as const,
            }));
        } else {
            // User role - show personal stats
            const userContractsCount = await context.cloudflare.env.DB
                .prepare("SELECT COUNT(*) AS count FROM contracts WHERE client_id = ?")
                .bind(user.id)
                .first<any>();

            const [activeContractsCount, upcomingContractsCount] = await Promise.all([
                context.cloudflare.env.DB
                    .prepare("SELECT COUNT(*) AS count FROM contracts WHERE client_id = ? AND status = 'active'")
                    .bind(user.id)
                    .first<any>(),
                context.cloudflare.env.DB
                    .prepare("SELECT COUNT(*) AS count FROM contracts WHERE client_id = ? AND status = 'active' AND start_date >= ?")
                    .bind(user.id, new Date().toISOString())
                    .first<any>(),
            ]);

            statCards = [
                {
                    name: "My Bookings",
                    value: userContractsCount?.count || 0,
                    subtext: "total bookings",
                    icon: "ClipboardDocumentListIcon",
                    href: "/dashboard/my-bookings",
                },
                {
                    name: "Active",
                    value: activeContractsCount?.count || 0,
                    subtext: "active rentals",
                    icon: "CheckCircleIcon",
                    href: "/dashboard/my-contracts",
                },
                {
                    name: "Upcoming",
                    value: upcomingContractsCount?.count || 0,
                    subtext: "scheduled",
                    icon: "CalendarIcon",
                    href: "/dashboard/my-bookings",
                },
            ];
        }
    } catch {
        // Return empty stats on error
        statCards = [];
        tasks = [];
    }

    return { user, statCards, tasks };
}

export default function Index() {
    const { user, statCards, tasks } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Toast notifications
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success) {
            toast.success(success, 3000);
        }
        if (error) {
            toast.error(error, 3000);
        }
    }, [searchParams, toast]);

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
