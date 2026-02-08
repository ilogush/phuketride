import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import Card from "~/components/dashboard/Card";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function CalendarPage() {
    const { user } = useLoaderData<typeof loader>();

    return (
        <div className="space-y-4">
            <PageHeader
                title="Calendar"
                rightActions={
                    <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                        Add Event
                    </Button>
                }
            />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Button
                        variant="secondary"
                        icon={<ChevronLeftIcon className="w-5 h-5" />}
                    />
                    <h2 className="text-xl font-bold text-gray-900">February 2026</h2>
                    <Button
                        variant="secondary"
                        icon={<ChevronRightIcon className="w-5 h-5" />}
                    />
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm">Month</Button>
                    <Button variant="secondary" size="sm">Week</Button>
                    <Button variant="secondary" size="sm">Day</Button>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border-gray-200">
                <div className="grid grid-cols-7 border-b border-gray-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 grid-rows-5">
                    {Array.from({ length: 35 }).map((_, i) => (
                        <div key={i} className="min-h-[120px] border-r border-b border-gray-100 p-2 hover:bg-gray-50/20 transition-colors group cursor-pointer">
                            <span className="text-xs font-bold text-gray-400 group-hover:text-gray-900 transition-colors">
                                {i + 1 > 28 ? i - 27 : i + 1}
                            </span>
                        </div>
                    ))}
                </div>
            </Card>
        </div>
    );
}
