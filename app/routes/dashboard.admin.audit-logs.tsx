import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import DataTable, { type Column } from "~/components/ui/DataTable";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function AuditLogsPage() {
    const { user } = useLoaderData<typeof loader>();

    const logs = [
        {
            id: '1',
            action: 'Company Created',
            user: 'phuketride.com@gmail.com',
            details: 'Created company: Tim Logush Rental',
            timestamp: new Date().toISOString(),
        },
    ];

    const columns: Column<typeof logs[0]>[] = [
        {
            key: 'timestamp',
            label: 'Timestamp',
            render: (log) => new Date(log.timestamp).toLocaleString(),
        },
        {
            key: 'action',
            label: 'Action',
        },
        {
            key: 'user',
            label: 'User',
        },
        {
            key: 'details',
            label: 'Details',
            wrap: true,
        },
    ];

    return (
        <div className="space-y-4 animate-in fade-in duration-700">
            <PageHeader title="Audit Logs" />

            <DataTable
                data={logs}
                columns={columns}
                totalCount={logs.length}
                emptyTitle="No audit logs found"
                emptyDescription="System activity will appear here"
            />
        </div>
    );
}
