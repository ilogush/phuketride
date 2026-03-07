import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import PageHeader from "~/components/dashboard/PageHeader";
import Card from "~/components/dashboard/Card";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import Button from "~/components/dashboard/Button";
import { useUrlToast } from "~/lib/useUrlToast";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadReportsPageData } from "~/lib/admin-analytics.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user } = await requireAdminAnalyticsAccess(request);
    return trackServerOperation({
        event: "reports.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: null,
        details: { route: "reports" },
        run: async () => loadReportsPageData({
            db: context.cloudflare.env.DB,
        }),
    });
}

export default function ReportsPage() {
    useUrlToast();
    const { reports } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <PageHeader title="Reports & Analytics" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reports.map((report) => (
                    <Card key={report.name} className="p-6 border-gray-200">
                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-gray-50 rounded-2xl">
                                    <ChartBarIcon className="w-6 h-6 text-gray-800" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{report.name}</h3>
                                    <p className="text-sm text-gray-500 mt-1">{report.description}</p>
                                    <p className="text-sm font-medium text-gray-900 mt-2">{report.metric}</p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm">Review</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
