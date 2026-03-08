type CountValue = number | string | null | undefined;

import { type D1DatabaseLike } from "~/lib/repo-types.server";

export type DashboardTaskStatus = "pending" | "in_progress" | "completed";

export interface DashboardTaskRow {
    id: number;
    title: string;
    description: string | null;
    status: DashboardTaskStatus;
}

export interface DashboardHomeStatCard {
    name: string;
    value: string | number;
    subtext: string;
    icon: string;
    href: string;
}

export interface DashboardHomeTask {
    id: string;
    title: string;
    description: string;
    status: DashboardTaskStatus;
    priority: "high" | "medium" | "low";
}

interface CompanyBankRow {
    bankName: string | null;
    accountNumber: string | null;
    accountName: string | null;
}

interface CompanyDashboardStatsRow {
    managersCount: CountValue;
    carsCount: CountValue;
    inWorkshopCount: CountValue;
    totalContracts: CountValue;
    monthContracts: CountValue;
    monthRevenue: CountValue;
}

interface AdminDashboardStatsRow {
    companiesCount: CountValue;
    usersCount: CountValue;
    carsCount: CountValue;
    contractsThisMonth: CountValue;
}

interface UserDashboardStatsRow {
    totalCount: CountValue;
    activeCount: CountValue;
    upcomingCount: CountValue;
}

function toNumber(value: CountValue) {
    return Number(value ?? 0);
}

function mapCalendarTasks(rows: DashboardTaskRow[]): DashboardHomeTask[] {
    return rows.map((task) => ({
        id: task.id.toString(),
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: "medium",
    }));
}

export function getStartOfMonthIso(referenceDate = new Date()) {
    const startOfMonth = new Date(referenceDate);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    return startOfMonth.toISOString();
}

export async function loadCompanyDashboardMetrics(params: {
    db: D1DatabaseLike;
    companyId: number;
    startOfMonthIso: string;
}) {
    const { db, companyId, startOfMonthIso } = params;

    const [company, stats, upcomingTasksResult] = await Promise.all([
        db.prepare(
            "SELECT bank_name AS bankName, account_number AS accountNumber, account_name AS accountName FROM companies WHERE id = ? LIMIT 1"
        ).bind(companyId).first<CompanyBankRow>(),
        db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM managers WHERE company_id = ? AND is_active = 1) AS managersCount,
                (SELECT COUNT(*) FROM company_cars WHERE company_id = ?) AS carsCount,
                (SELECT COUNT(*) FROM company_cars WHERE company_id = ? AND status = 'maintenance') AS inWorkshopCount,
                (
                    SELECT COUNT(*)
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                ) AS totalContracts,
                (
                    SELECT COUNT(*)
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ? AND c.created_at >= ?
                ) AS monthContracts,
                (
                    SELECT COALESCE(SUM(p.amount), 0)
                    FROM payments p
                    JOIN contracts c ON c.id = p.contract_id
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ? AND p.status = 'completed' AND p.created_at >= ?
                ) AS monthRevenue
        `).bind(
            companyId,
            companyId,
            companyId,
            companyId,
            companyId,
            startOfMonthIso,
            companyId,
            startOfMonthIso
        ).first<CompanyDashboardStatsRow>(),
        db.prepare(`
            SELECT id, title, description, status
            FROM calendar_events
            WHERE company_id = ? AND status = 'pending'
            ORDER BY start_date DESC
            LIMIT 5
        `).bind(companyId).all<DashboardTaskRow>(),
    ]);

    return {
        company,
        managersCount: toNumber(stats?.managersCount),
        carsCount: toNumber(stats?.carsCount),
        inWorkshopCount: toNumber(stats?.inWorkshopCount),
        totalContracts: toNumber(stats?.totalContracts),
        monthContracts: toNumber(stats?.monthContracts),
        monthRevenue: toNumber(stats?.monthRevenue),
        tasks: upcomingTasksResult.results || [],
    };
}

export async function loadAdminDashboardMetrics(params: {
    db: D1DatabaseLike;
    startOfMonthIso: string;
}) {
    const { db, startOfMonthIso } = params;

    const [stats, upcomingTasksResult] = await Promise.all([
        db.prepare(`
            SELECT
                (SELECT COUNT(*) FROM companies) AS companiesCount,
                (SELECT COUNT(*) FROM users) AS usersCount,
                (SELECT COUNT(*) FROM company_cars) AS carsCount,
                (SELECT COUNT(*) FROM contracts WHERE created_at >= ?) AS contractsThisMonth
        `).bind(startOfMonthIso).first<AdminDashboardStatsRow>(),
        db.prepare(`
            SELECT id, title, description, status
            FROM calendar_events
            WHERE status = 'pending'
            ORDER BY start_date DESC
            LIMIT 5
        `).all<DashboardTaskRow>(),
    ]);

    return {
        companiesCount: toNumber(stats?.companiesCount),
        usersCount: toNumber(stats?.usersCount),
        carsCount: toNumber(stats?.carsCount),
        contractsThisMonth: toNumber(stats?.contractsThisMonth),
        tasks: upcomingTasksResult.results || [],
    };
}

export async function loadUserDashboardMetrics(params: {
    db: D1DatabaseLike;
    userId: string;
    nowIso: string;
}) {
    const { db, userId, nowIso } = params;
    const stats = await db.prepare(`
        SELECT
            COUNT(*) AS totalCount,
            SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS activeCount,
            SUM(CASE WHEN status = 'active' AND start_date >= ? THEN 1 ELSE 0 END) AS upcomingCount
        FROM contracts
        WHERE client_id = ?
    `).bind(nowIso, userId).first<UserDashboardStatsRow>();

    return {
        totalCount: toNumber(stats?.totalCount),
        activeCount: toNumber(stats?.activeCount),
        upcomingCount: toNumber(stats?.upcomingCount),
    };
}

export async function loadDashboardHomeData(params: {
    db: D1DatabaseLike;
    user: {
        id: string;
        role: "admin" | "partner" | "manager" | "user";
    };
    effectiveCompanyId: number | null;
    startOfMonthIso?: string;
    nowIso?: string;
}) {
    const {
        db,
        user,
        effectiveCompanyId,
        startOfMonthIso = getStartOfMonthIso(),
        nowIso = new Date().toISOString(),
    } = params;

    let statCards: DashboardHomeStatCard[] = [];
    let tasks: DashboardHomeTask[] = [];

    if (effectiveCompanyId) {
        const metrics = await loadCompanyDashboardMetrics({
            db,
            companyId: effectiveCompanyId,
            startOfMonthIso,
        });
        const onlineUsers = 0;

        statCards = [
            {
                name: "Users",
                value: `${metrics.managersCount}/${onlineUsers}`,
                subtext: "total / online",
                icon: "UserGroupIcon",
                href: "/users",
            },
            {
                name: "Cars",
                value: `${metrics.carsCount}/${metrics.inWorkshopCount}`,
                subtext: "total / in workshop",
                icon: "TruckIcon",
                href: "/cars",
            },
            {
                name: "Contracts",
                value: `${metrics.totalContracts}/${metrics.monthContracts}`,
                subtext: "total / active this month",
                icon: "ClipboardDocumentListIcon",
                href: "/contracts",
            },
            {
                name: "Revenue",
                value: `฿${metrics.monthRevenue.toLocaleString("en-US")}`,
                subtext: "this month",
                icon: "BanknotesIcon",
                href: "/payments",
            },
        ];

        tasks = mapCalendarTasks(metrics.tasks);

        const isCompanyIncomplete = metrics.company && (
            !metrics.company.bankName ||
            !metrics.company.accountNumber ||
            !metrics.company.accountName
        );

        if (isCompanyIncomplete) {
            tasks.unshift({
                id: "company-setup",
                title: "Complete Company Profile",
                description: "Please fill in your company bank details in settings to start receiving payments",
                status: "pending",
                priority: "high",
            });
        }

        return { statCards, tasks };
    }

    if (user.role === "admin") {
        const metrics = await loadAdminDashboardMetrics({
            db,
            startOfMonthIso,
        });
        const onlineUsers = 0;

        statCards = [
            {
                name: "Users",
                value: `${metrics.usersCount}/${onlineUsers}`,
                subtext: "total / online",
                icon: "UserGroupIcon",
                href: "/users",
            },
            {
                name: "Companies",
                value: metrics.companiesCount,
                subtext: "total registered",
                icon: "BuildingOfficeIcon",
                href: "/companies",
            },
            {
                name: "Cars",
                value: metrics.carsCount,
                subtext: "total templates",
                icon: "TruckIcon",
                href: "/cars",
            },
            {
                name: "Contracts",
                value: metrics.contractsThisMonth,
                subtext: "this month",
                icon: "ClipboardDocumentListIcon",
                href: "/contracts",
            },
        ];

        tasks = mapCalendarTasks(metrics.tasks);

        return { statCards, tasks };
    }

    const metrics = await loadUserDashboardMetrics({
        db,
        userId: user.id,
        nowIso,
    });

    statCards = [
        {
            name: "My Bookings",
            value: metrics.totalCount,
            subtext: "total bookings",
            icon: "ClipboardDocumentListIcon",
            href: "/my-bookings",
        },
        {
            name: "Active",
            value: metrics.activeCount,
            subtext: "active rentals",
            icon: "CheckCircleIcon",
            href: "/my-contracts",
        },
        {
            name: "Upcoming",
            value: metrics.upcomingCount,
            subtext: "scheduled",
            icon: "CalendarIcon",
            href: "/my-bookings",
        },
    ];

    return { statCards, tasks };
}
