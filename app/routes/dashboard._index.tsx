import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
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
import StatCard from "~/components/dashboard/StatCard";
import TasksWidget from "~/components/dashboard/TasksWidget";
import { useToast } from "~/lib/toast";
import { useEffect } from "react";

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const taskId = formData.get("taskId") as string;
    const intent = formData.get("intent") as string;

    if (intent === "delete" && taskId) {
        try {
            const db = drizzle(context.cloudflare.env.DB);
            
            // Delete calendar event (task)
            await context.cloudflare.env.DB
                .prepare("DELETE FROM calendar_events WHERE id = ?")
                .bind(parseInt(taskId))
                .run();

            return redirect("/dashboard?success=Task deleted successfully");
        } catch (error) {
            console.error("Error deleting task:", error);
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

            const onlineUsers = 0; // Online tracking not implemented

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
            
            // Get company data to check if profile is complete
            const [company] = await db
                .select()
                .from(companies)
                .where(eq(companies.id, user.companyId))
                .limit(1);

            // Get company users count (managers + users who have contracts with this company)
            const [managersCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(users)
                .innerJoin(sql`managers`, sql`managers.user_id = users.id`)
                .where(
                    and(
                        sql`managers.company_id = ${user.companyId}`,
                        sql`managers.is_active = 1`
                    )
                );

            const onlineUsers = 0; // Online tracking not implemented

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

            // Check if company profile is incomplete
            const isCompanyIncomplete = company && (
                !company.bankName ||
                !company.accountNumber ||
                !company.accountName
            );

            // Load tasks from calendar events for partner/manager
            const upcomingTasks = await db
                .select({
                    id: calendarEvents.id,
                    title: calendarEvents.title,
                    description: calendarEvents.description,
                    status: calendarEvents.status,
                })
                .from(calendarEvents)
                .where(
                    and(
                        eq(calendarEvents.companyId, user.companyId),
                        eq(calendarEvents.status, "pending")
                    )
                )
                .orderBy(desc(calendarEvents.startDate))
                .limit(5);

            tasks = upcomingTasks.map(task => ({
                id: task.id.toString(),
                title: task.title,
                description: task.description || "",
                status: task.status as "pending" | "in_progress" | "completed",
                priority: "medium" as const,
            }));

            // Add company profile completion notification if needed
            if (isCompanyIncomplete) {
                tasks.unshift({
                    id: "company-setup",
                    title: "Complete Company Profile",
                    description: "Please fill in your company bank details in settings to start receiving payments",
                    status: "pending" as const,
                    priority: "high" as const,
                });
            }
        } else {
            // User role - show personal stats
            const [userContractsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .where(eq(contracts.clientId, user.id));

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const [activeContractsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .where(
                    and(
                        eq(contracts.clientId, user.id),
                        eq(contracts.status, "active")
                    )
                );

            const [upcomingContractsCount] = await db
                .select({ count: sql<number>`count(*)` })
                .from(contracts)
                .where(
                    and(
                        eq(contracts.clientId, user.id),
                        eq(contracts.status, "active"),
                        gte(contracts.startDate, new Date())
                    )
                );

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
    } catch (error) {
        console.error("Error loading dashboard stats:", error);
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
