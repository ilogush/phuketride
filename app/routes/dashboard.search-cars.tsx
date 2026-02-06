import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { MagnifyingGlassIcon, AdjustmentsHorizontalIcon, TruckIcon } from "@heroicons/react/24/outline";
import Button from "~/components/ui/Button";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function SearchCarsPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <PageHeader title="Search Cars" />

            {/* Search Filters */}
            <Card className="p-6 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative">
                        <input
                            type="text"
                            placeholder="Search by model, brand, or location..."
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:border-gray-300 transition-all"
                        />
                        <MagnifyingGlassIcon className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
                    </div>
                    <div className="flex gap-4">
                        <Button variant="secondary" fullWidth icon={<AdjustmentsHorizontalIcon className="w-5 h-5" />}>
                            Filters
                        </Button>
                        <Button variant="primary" fullWidth>
                            Search
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Results Grid */}
            <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                    <TruckIcon className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Find your perfect ride</h3>
                <p className="text-gray-500 mt-2">Enter your destination and dates to explore available cars</p>
            </div>
        </div>
    );
}
