import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import Button from "~/components/ui/Button";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function ReportsPage() {
    const { user } = useLoaderData<typeof loader>();

    const reports = [
        { name: "Revenue Report", description: "Monthly revenue breakdown by company" },
        { name: "Fleet Activity", description: "Car utilization and maintenance summary" },
        { name: "User Activity", description: "Logins and actions by role" },
        { name: "Contract Summary", description: "Active vs Expired contracts" },
    ];

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
                                </div>
                            </div>
                            <Button variant="secondary" size="sm">Generate</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
