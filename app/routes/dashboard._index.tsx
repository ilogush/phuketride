import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { companies, users, companyCars, contracts, calendarEvents } from "~/db/schema";
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
import StatCard from "~/components/ui/StatCard";
import TasksWidget from "~/components/ui/TasksWidget";

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
    const db = drizzle(context.cloudflare.env.DB);

    let statCards: any[] = [];
    let tasks: any[] = [];

    try {
        if (user.role === "admin") {
            // Admin stats
            const [companiesCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(companies);

            const [usersCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(users);

            const [carsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(companyCars);

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Using Date object for drizzle-orm timestamp comparison
            const [contractsThisMonth] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .where(gte(contracts.createdAt, startOfMonth));

            statCards = [
                {
                    name: "Companies",
                    value: companiesCount?.count || 0,
                    subtext: "total registered",
                    icon: "BuildingOfficeIcon",
                    href: "/dashboard/companies",
                },
                {
                    name: "Users",
                    value: `${usersCount?.count || 0}/0`,
                    subtext: "total / online",
                    icon: "UserGroupIcon",
                    href: "/dashboard/users",
                },
                {
                    name: "Cars",
                    value: carsCount?.count || 0,
                    subtext: "total templates",
                    icon: "TruckIcon",
                    href: "/dashboard/cars",
                },
                {
                    name: "Contracts",
                    value: contractsThisMonth?.count || 0,
                    subtext: "this month",
                    icon: "ClipboardDocumentListIcon",
                    href: "/dashboard/contracts",
                },
            ];

            // Load tasks from calendar events
            const upcomingTasks = await db
                .select({
                    id: calendarEvents.id,
                    title: calendarEvents.title,
                    description: calendarEvents.description,
                    status: calendarEvents.status,
                })
                .from(calendarEvents)
                .where(eq(calendarEvents.status, "pending"))
                .orderBy(desc(calendarEvents.startDate))
                .limit(5);

            tasks = upcomingTasks.map(task => ({
                id: task.id.toString(),
                title: task.title,
                description: task.description || "",
                status: task.status as "pending" | "in_progress" | "completed",
                priority: "medium" as const,
            }));
        } else if (user.companyId) {
            // Partner/Manager stats
            const [carsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(companyCars)
                .where(eq(companyCars.companyId, user.companyId));

            const [contractsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .innerJoin(companyCars, eq(contracts.companyCarId, companyCars.id))
                .where(eq(companyCars.companyId, user.companyId));

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const [activeContractsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .innerJoin(companyCars, eq(contracts.companyCarId, companyCars.id))
                .where(
                    and(
                        eq(companyCars.companyId, user.companyId),
                        gte(contracts.createdAt, startOfMonth)
                    )
                );

            statCards = [
                {
                    name: "Cars",
                    value: `${carsCount?.count || 0}/0`,
                    subtext: "total / in workshop",
                    icon: "TruckIcon",
                    href: "/dashboard/cars",
                },
                {
                    name: "Contracts",
                    value: `${contractsCount?.count || 0}/${activeContractsCount?.count || 0}`,
                    subtext: "total / active this month",
                    icon: "ClipboardDocumentListIcon",
                    href: "/dashboard/contracts",
                },
                {
                    name: "Revenue",
                    value: "฿0",
                    subtext: "this month",
                    icon: "BanknotesIcon",
                    href: "/dashboard/payments",
                },
            ];
        } else {
            // User role - show personal stats
            const [userContractsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .where(eq(contracts.userId, user.id));

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const [activeContractsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .where(
                    and(
                        eq(contracts.userId, user.id),
                        gte(contracts.createdAt, startOfMonth)
                    )
                );

            statCards = [
                {
                    name: "My Bookings",
                    value: userContractsCount?.count || 0,
                    subtext: "total bookings",
                    icon: "ClipboardDocumentListIcon",
                    href: "/dashboard/bookings",
                },
                {
                    name: "Active",
                    value: activeContractsCount?.count || 0,
                    subtext: "this month",
                    icon: "CheckCircleIcon",
                    href: "/dashboard/bookings",
                },
                {
                    name: "Upcoming",
                    value: 0,
                    subtext: "scheduled",
                    icon: "CalendarIcon",
                    href: "/dashboard/bookings",
                },
            ];
        }
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
        // Return empty stats on error
        statCards = [];
        tasks = [];
    }

    return { user, statCards, tasks };
}

export default function DashboardIndex() {
    const { user, statCards, tasks } = useLoaderData<typeof loader>();

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
