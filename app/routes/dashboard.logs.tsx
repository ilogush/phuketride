import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { ClipboardDocumentListIcon } from "@heroicons/react/24/outline";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";

interface AuditLog {
    id: number;
    userId: string | null;
    role: string | null;
    companyId: number | null;
    entityType: string;
    entityId: number | null;
    action: string;
    beforeState: string | null;
    afterState: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    createdAt: Date;
    userName: string | null;
    userSurname: string | null;
}

const ACTION_COLORS: Record<string, string> = {
    create: "bg-green-100 text-green-800",
    update: "bg-orange-100 text-orange-800",
    delete: "bg-red-100 text-red-800",
    view: "bg-blue-100 text-blue-800",
    export: "bg-purple-100 text-purple-800",
    login: "bg-blue-100 text-blue-800",
    logout: "bg-gray-100 text-gray-800",
    clear: "bg-red-100 text-red-800",
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const effectiveCompanyId = getEffectiveCompanyId(request, user);

    const baseQuery = db
        .select({
            id: schema.auditLogs.id,
            userId: schema.auditLogs.userId,
            role: schema.auditLogs.role,
            companyId: schema.auditLogs.companyId,
            entityType: schema.auditLogs.entityType,
            entityId: schema.auditLogs.entityId,
            action: schema.auditLogs.action,
            beforeState: schema.auditLogs.beforeState,
            afterState: schema.auditLogs.afterState,
            ipAddress: schema.auditLogs.ipAddress,
            userAgent: schema.auditLogs.userAgent,
            createdAt: schema.auditLogs.createdAt,
            userName: schema.users.name,
            userSurname: schema.users.surname,
        })
        .from(schema.auditLogs)
        .leftJoin(schema.users, eq(schema.auditLogs.userId, schema.users.id))
        .orderBy(desc(schema.auditLogs.createdAt));

    // Partner and manager can only see logs from their company.
    // Admin should always see all logs, including in mod mode.
    if (user.role !== "admin" && effectiveCompanyId) {
        const logs = await baseQuery.where(eq(schema.auditLogs.companyId, effectiveCompanyId)).limit(100);
        return { user, logs };
    }

    const logs = await baseQuery.limit(100);
    return { user, logs };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");
    const effectiveCompanyId = getEffectiveCompanyId(request, user);

    if (intent === "clear") {
        if (user.role !== "admin" && effectiveCompanyId) {
            await db.delete(schema.auditLogs).where(eq(schema.auditLogs.companyId, effectiveCompanyId));
        } else {
            // Admin can clear all logs
            await db.delete(schema.auditLogs);
        }
        
        return data({ success: true, message: "Audit logs cleared successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function AuditLogsPage() {
    const { logs } = useLoaderData<typeof loader>();

    const columns: Column<AuditLog>[] = [
        {
            key: "createdAt",
            label: "Timestamp",
            render: (log) => (
                <div className="text-sm">
                    <div className="font-medium text-gray-900">
                        {new Date(log.createdAt).toLocaleDateString("en-GB")}
                    </div>
                    <div className="text-gray-500">
                        {new Date(log.createdAt).toLocaleTimeString("en-GB")}
                    </div>
                </div>
            ),
        },
        {
            key: "userId",
            label: "Actor",
            render: (log) => (
                <div className="text-sm">
                    <div className="font-medium text-gray-900">
                        {log.userName
                            ? `${log.userName}${log.userSurname ? ' ' + log.userSurname : ''}`.trim()
                            : log.userId || "System"}
                    </div>
                    <div className="text-gray-500">{log.role || "-"}</div>
                </div>
            ),
        },
        {
            key: "action",
            label: "Action",
            render: (log) => (
                <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded-xl ${ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800"
                        }`}
                >
                    {log.action}
                </span>
            ),
        },
        {
            key: "entityType",
            label: "Target Entity",
            render: (log) => (
                <div className="text-sm">
                    <div className="font-medium text-gray-900">{log.entityType}</div>
                    <div className="text-gray-500">
                        {log.companyId ? `company #${log.companyId}` : "-"}
                    </div>
                </div>
            ),
        },
        {
            key: "details",
            label: "Change Details",
            render: (log) => {
                if (!log.beforeState && !log.afterState) {
                    return <span className="text-gray-500">-</span>;
                }

                try {
                    const before = log.beforeState ? JSON.parse(log.beforeState) : null;
                    const after = log.afterState ? JSON.parse(log.afterState) : null;

                    if (before && after) {
                        const changes = Object.keys(after).filter(
                            (key) => before[key] !== after[key]
                        );
                        if (changes.length > 0) {
                            return (
                                <span className="text-sm text-gray-700">
                                    Modified {changes.length} field{changes.length > 1 ? "s" : ""}{" "}
                                    <span className="text-gray-500">
                                        {changes.slice(0, 2).join(", ")}
                                        {changes.length > 2 ? "..." : ""}
                                    </span>
                                </span>
                            );
                        }
                    }

                    return <span className="text-gray-500">-</span>;
                } catch {
                    return <span className="text-gray-500">-</span>;
                }
            },
        },
        {
            key: "source",
            label: "Source",
            render: (log) => (
                <div className="text-xs text-gray-500 max-w-xs truncate">
                    {log.ipAddress && (
                        <div className="font-mono">::{log.ipAddress.slice(-4)}</div>
                    )}
                    {log.userAgent && (
                        <div className="truncate" title={log.userAgent}>
                            {log.userAgent.includes("Mozilla")
                                ? "Mozilla/5.0"
                                : log.userAgent.slice(0, 20)}
                            ...
                        </div>
                    )}
                    {!log.ipAddress && !log.userAgent && "-"}
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="System Audit Logs"
                rightActions={
                    logs.length > 0 && (
                        <Form method="post">
                            <input type="hidden" name="intent" value="clear" />
                            <Button type="submit" variant="primary">
                                Clear All Logs
                            </Button>
                        </Form>
                    )
                }
            />

            {logs.length > 0 ? (
                <DataTable
                    columns={columns}
                    data={logs}
                    disablePagination={true}
                    emptyTitle="No audit logs found"
                    emptyDescription="System activity will appear here"
                />
            ) : (
                <div className="bg-white rounded-3xl shadow-sm p-12 py-4">
                    <div className="text-center">
                        <AuditIcon />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">
                            No audit logs found
                        </h3>
                        <p className="mt-2 text-sm text-gray-500">
                            System activity will appear here
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function AuditIcon() {
    return (
        <ClipboardDocumentListIcon className="w-10 h-10 mx-auto text-gray-400" />
    );
}
