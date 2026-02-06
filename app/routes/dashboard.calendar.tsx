import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function CalendarPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
                <p className="text-gray-600 mt-2">
                    View bookings and schedule
                </p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm p-4">
                <p className="text-gray-500">Calendar page - Coming soon</p>
            </div>
        </div>
    );
}
