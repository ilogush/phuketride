import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { DocumentTextIcon, FunnelIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import SimplePagination from "~/components/dashboard/SimplePagination";
import Button from "~/components/dashboard/Button";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadClientRentalHistoryPage } from "~/lib/user-self-service.server";
import { useUrlToast } from "~/lib/useUrlToast";

interface MyContractRow {
    id: number;
    startDate: string;
    endDate: string;
    totalAmount: number;
    totalCurrency: string;
    status: "active" | "closed";
    createdAt: string;
    carLicensePlate: string;
    carYear: number;
    brandName: string | null;
    modelName: string | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const url = new URL(request.url);

    return trackServerOperation({
        event: "my-contracts.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: user.companyId ?? null,
        details: { route: "my-contracts" },
        run: async () => {
            const { rows, totalPages, currentPage, status } = await loadClientRentalHistoryPage({
                db: context.cloudflare.env.DB,
                userId: user.id,
                url,
                includeColor: false,
            });
            return {
                contracts: rows as MyContractRow[],
                totalPages,
                currentPage,
                status,
            };
        },
    });
}

export default function MyContractsPage() {
    useUrlToast();
    const { contracts, totalPages, currentPage, status } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();

    const handleStatusChange = (newStatus: string) => {
        setSearchParams({ status: newStatus, page: "1" });
    };

    const statusColors = {
        active: "bg-blue-100 text-blue-800",
        closed: "bg-green-100 text-green-800",
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">My Contracts</h1>
                <p className="text-sm text-gray-500 mt-1">View your rental agreements</p>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-4">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("all")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "all" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            All
                        </Button>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("active")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "active" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Active
                        </Button>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => handleStatusChange("closed")}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${status === "closed" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                        >
                            Closed
                        </Button>
                    </div>
                </div>
            </div>

            {/* Contracts List */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                {contracts.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {contracts.map((contract: MyContractRow) => (
                            <Link
                                key={contract.id}
                                to={`/my-contracts/${contract.id}`}
                                className="block p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-100 rounded-xl p-3">
                                            <DocumentTextIcon className="h-6 w-6 text-gray-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold text-gray-900">
                                                    Contract #{contract.id}
                                                </h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[contract.status as keyof typeof statusColors]}`}>
                                                    {contract.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {contract.brandName} {contract.modelName} {contract.carYear} ({contract.carLicensePlate})
                                            </p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {format(new Date(contract.startDate), "MMM dd, yyyy")} -{" "}
                                                {format(new Date(contract.endDate), "MMM dd, yyyy")}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-gray-900">
                                            {contract.totalCurrency} {contract.totalAmount}
                                        </p>
                                        <p className="text-sm text-blue-600 mt-1">View Details →</p>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <DocumentTextIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">No contracts found</p>
                        <p className="text-sm text-gray-400 mt-1">
                            Your rental contracts will appear here
                        </p>
                    </div>
                )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <SimplePagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={(page) => setSearchParams({ status, page: page.toString() })}
                />
            )}
        </div>
    );
}
