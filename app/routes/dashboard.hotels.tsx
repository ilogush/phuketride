import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import { PlusIcon, HomeModernIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function HotelsPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Hotels"
                rightActions={
                    <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                        Add Hotel
                    </Button>
                }
            />

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-center py-12">
                    <HomeModernIcon className="w-16 h-16 mx-auto text-gray-400" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No hotels yet</h3>
                    <p className="mt-2 text-sm text-gray-500">Add hotels for car delivery locations</p>
                </div>
            </div>
        </div>
    );
}

function HotelIcon() {
    return (
        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
    )
}
