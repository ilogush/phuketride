import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function SeasonsPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Seasons</h1>
                <p className="text-gray-600 mt-2">
                    Define seasonal pricing periods (high season, low season, etc.)
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-center py-12">
                    <SeasonIcon />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No seasons configured</h3>
                    <p className="mt-2 text-sm text-gray-500">Define seasonal pricing periods for your rental business</p>
                </div>
            </div>
        </div>
    );
}

function SeasonIcon() {
    return (
        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    )
}
