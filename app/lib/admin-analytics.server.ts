import {
    clearAuditLogs,
    countContractsByStatus,
    countContractsCreatedBetween,
    deleteDashboardTask,
    getAnalyticsReportSummary,
    getDashboardTaskById,
    listAuditLogs,
    listCompaniesByLocation,
    type DashboardActivityPoint,
    type ContractStats,
} from "~/lib/admin-analytics-repo.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";

function getStartOfDay(referenceDate: Date) {
    const value = new Date(referenceDate);
    value.setHours(0, 0, 0, 0);
    return value;
}

function formatDateKey(date: Date) {
    return date.toISOString().split("T")[0];
}

export async function loadDashboardChartsData(args: {
    db: D1Database;
    companyId: number | null;
    now?: Date;
}) {
    const now = args.now ?? new Date();
    const todayStart = getStartOfDay(now);

    const activityByDay = await Promise.all(Array.from({ length: 7 }, async (_, index) => {
        const i = 6 - index;
        const date = new Date(todayStart);
        date.setDate(date.getDate() - i);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const count = await countContractsCreatedBetween(args.db, {
            startMs: date.getTime(),
            endMs: nextDate.getTime(),
            companyId: args.companyId,
        });

        return {
            date: formatDateKey(date),
            count,
        } satisfies DashboardActivityPoint;
    }));

    const [companiesByLocation, active, closed, closedToday] = await Promise.all([
        listCompaniesByLocation(args.db, { companyId: args.companyId, limit: 5 }),
        countContractsByStatus(args.db, { status: "active", companyId: args.companyId }),
        countContractsByStatus(args.db, { status: "closed", companyId: args.companyId }),
        countContractsByStatus(args.db, {
            status: "closed",
            companyId: args.companyId,
            updatedSinceMs: todayStart.getTime(),
        }),
    ]);

    return {
        activityByDay,
        companiesByLocation: companiesByLocation.map((item) => ({
            location: item.location || "Unknown",
            count: Number(item.count ?? 0),
        })),
        contractStats: {
            active,
            closed,
            closedToday,
        } satisfies ContractStats,
    };
}

export async function loadReportsPageData(args: {
    db: D1Database;
    companyId: number | null;
    now?: Date;
}) {
    const now = args.now ?? new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const todayStart = getStartOfDay(now);
    const summary = await getAnalyticsReportSummary(args.db, {
        startMs: start.getTime(),
        todayStartMs: todayStart.getTime(),
        companyId: args.companyId,
    });

    return {
        reports: [
            {
                name: "Revenue Report",
                description: "Operational activity for the last 7 days across all contracts.",
                metric: `${summary.contractsCreatedLast7Days} new contracts`,
            },
            {
                name: "Fleet Activity",
                description: "Location coverage and company distribution snapshot.",
                metric: `${summary.locationsTracked} active locations`,
            },
            {
                name: "User Activity",
                description: "Audit trail volume for admin review and safety checks.",
                metric: `${summary.auditEntries} audit entries`,
            },
            {
                name: "Contract Summary",
                description: "Current active load and closures completed today.",
                metric: `${summary.activeContracts} active / ${summary.closedToday} closed today`,
            },
        ],
        summary,
    };
}

export async function deleteDashboardTaskFromForm(args: {
    db: D1Database;
    request: Request;
    companyId: number | null;
    taskId: number;
}) {
    const task = await getDashboardTaskById(args.db, {
        taskId: args.taskId,
        companyId: args.companyId,
    });
    if (!task) {
        return redirectWithRequestError(args.request, "/home", "Task not found");
    }

    await deleteDashboardTask(args.db, {
        taskId: args.taskId,
        companyId: args.companyId,
    });

    return redirectWithRequestSuccess(args.request, "/home", "Task deleted successfully");
}
