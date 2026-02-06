import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function ColorsPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Car Colors</h1>
                <p className="text-gray-600 mt-2">
                    Add available car colors for the system
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <div className="text-center py-12">
                    <ColorIcon />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No colors configured</h3>
                    <p className="mt-2 text-sm text-gray-500">Add available car colors for your rental system</p>
                </div>
            </div>
        </div>
    );
}

function ColorIcon() {
    return (
        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
    )
}
