import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function DurationsPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Rental Durations</h1>
                <p className="text-gray-600 mt-2">
                    Set up rental duration periods and pricing
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-center py-12">
                    <ClockIcon />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No durations configured</h3>
                    <p className="mt-2 text-sm text-gray-500">Set up rental duration periods and pricing rules</p>
                </div>
            </div>
        </div>
    );
}

function ClockIcon() {
    return (
        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    )
}
