import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import { PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function BookingsPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bookings"
                rightActions={
                    <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                        New Booking
                    </Button>
                }
            />

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                <p className="text-gray-500">Bookings page - Coming soon</p>
            </div>
        </div>
    );
}
