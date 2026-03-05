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

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
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
            // Delete calendar event (task)
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
}

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;
type TaskStatus = "pending" | "in_progress" | "completed";

interface StatCardItem {
    name: string;
    value: string | number;
    subtext: string;
    icon: string;
    href: string;
}

interface TaskItem {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: "high" | "medium" | "low";
}

interface CountRow {
    count: number;
}

interface CompanyBankRow {
    bankName: string | null;
    accountNumber: string | null;
    accountName: string | null;
}

interface CalendarTaskRow {
    id: number;
    title: string;
    description: string | null;
    status: TaskStatus;
}

interface ContractCountsRow {
    totalCount: number | string;
    monthCount: number | string;
}

interface UserContractCountsRow {
    totalCount: number | string;
    activeCount: number | string;
    upcomingCount: number | string;
}

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

function mapCalendarTasks(rows: CalendarTaskRow[]): TaskItem[] {
    return rows.map((task) => ({
        id: task.id.toString(),
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: "medium",
    }));
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);

    let statCards: StatCardItem[] = [];
    let tasks: TaskItem[] = [];

    try {
        if (effectiveCompanyId) {
            // Partner/Manager/Admin(mod mode) stats for selected company
            const companyPromise = context.cloudflare.env.DB
                .prepare("SELECT bank_name AS bankName, account_number AS accountNumber, account_name AS accountName FROM companies WHERE id = ? LIMIT 1")
                .bind(effectiveCompanyId)
                .first() as Promise<CompanyBankRow | null>;
            const managersCountPromise = context.cloudflare.env.DB
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM managers
                    WHERE company_id = ? AND is_active = 1
                `)
                .bind(effectiveCompanyId)
                .first() as Promise<CountRow | null>;

            const onlineUsers = 0; // Online tracking not implemented

            const carsCountPromise = context.cloudflare.env.DB
                .prepare("SELECT COUNT(*) AS count FROM company_cars WHERE company_id = ?")
                .bind(effectiveCompanyId)
                .first() as Promise<CountRow | null>;

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const contractCountsPromise = context.cloudflare.env.DB
                .prepare(`
                    SELECT
                        COUNT(*) AS totalCount,
                        SUM(CASE WHEN c.created_at >= ? THEN 1 ELSE 0 END) AS monthCount
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                `)
                .bind(startOfMonth.toISOString(), effectiveCompanyId)
                .first() as Promise<ContractCountsRow | null>;

            const upcomingTasksPromise = context.cloudflare.env.DB
                .prepare(`
                    SELECT id, title, description, status
                    FROM calendar_events
                    WHERE company_id = ? AND status = 'pending'
                    ORDER BY start_date DESC
                    LIMIT 5
                `)
                .bind(effectiveCompanyId)
                .all() as Promise<{ results?: CalendarTaskRow[] }>;

            const [company, managersCount, carsCount, contractCounts, upcomingTasksResult] = await Promise.all([
                companyPromise,
                managersCountPromise,
                carsCountPromise,
                contractCountsPromise,
                upcomingTasksPromise,
            ]);

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
                    value: `${Number(contractCounts?.totalCount || 0)}/${Number(contractCounts?.monthCount || 0)}`,
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

            tasks = mapCalendarTasks(upcomingTasksResult.results || []);

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
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const [companiesCount, usersCount, carsCount, contractsThisMonth, upcomingTasksResult] = await Promise.all([
                context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM companies").first() as Promise<CountRow | null>,
                context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM users").first() as Promise<CountRow | null>,
                context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM company_cars").first() as Promise<CountRow | null>,
                context.cloudflare.env.DB
                    .prepare("SELECT COUNT(*) AS count FROM contracts WHERE created_at >= ?")
                    .bind(startOfMonth.toISOString())
                    .first() as Promise<CountRow | null>,
                context.cloudflare.env.DB
                    .prepare(`
                        SELECT id, title, description, status
                        FROM calendar_events
                        WHERE status = 'pending'
                        ORDER BY start_date DESC
                        LIMIT 5
                    `)
                    .all() as Promise<{ results?: CalendarTaskRow[] }>,
            ]);

            const onlineUsers = 0; // Online tracking not implemented

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

            tasks = mapCalendarTasks(upcomingTasksResult.results || []);
        } else {
            // User role - show personal stats
            const userContractCounts = await context.cloudflare.env.DB
                .prepare(`
                    SELECT
                        COUNT(*) AS totalCount,
                        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeCount,
                        SUM(CASE WHEN status = 'active' AND start_date >= ? THEN 1 ELSE 0 END) AS upcomingCount
                    FROM contracts
                    WHERE client_id = ?
                `)
                .bind(new Date().toISOString(), user.id)
                .first() as UserContractCountsRow | null;

            statCards = [
                {
                    name: "My Bookings",
                    value: Number(userContractCounts?.totalCount || 0),
                    subtext: "total bookings",
                    icon: "ClipboardDocumentListIcon",
                    href: "/my-bookings",
                },
                {
                    name: "Active",
                    value: Number(userContractCounts?.activeCount || 0),
                    subtext: "active rentals",
                    icon: "CheckCircleIcon",
                    href: "/my-contracts",
                },
                {
                    name: "Upcoming",
                    value: Number(userContractCounts?.upcomingCount || 0),
                    subtext: "scheduled",
                    icon: "CalendarIcon",
                    href: "/my-bookings",
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
