import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { BellIcon, CalendarIcon, CurrencyDollarIcon, TruckIcon } from "@heroicons/react/24/outline";
import { format, addDays } from "date-fns";
import PageHeader from "~/components/dashboard/PageHeader";
import Card from "~/components/dashboard/Card";
import EmptyState from "~/components/dashboard/EmptyState";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);

    const notifications: Array<{
        id: string;
        type: "contract" | "payment" | "reminder";
        title: string;
        message: string;
        date: Date;
        read: boolean;
    }> = [];

    // Get upcoming contract end dates (within 3 days)
    const threeDaysFromNow = addDays(new Date(), 3);
    const upcomingContractsResult = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                c.id,
                c.end_date AS endDate,
                cc.license_plate AS carLicensePlate,
                cb.name AS brandName,
                cm.name AS modelName
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            WHERE c.client_id = ? AND c.status = 'active' AND c.end_date >= ?
            LIMIT 10
        `)
        .bind(user.id, new Date().toISOString())
        .all() as { results?: any[] };
    const upcomingContracts = upcomingContractsResult.results || [];

    upcomingContracts.forEach((contract) => {
        if (contract.endDate <= threeDaysFromNow) {
            notifications.push({
                id: `contract-${contract.id}`,
                type: "reminder",
                title: "Upcoming Return",
                message: `Your rental of ${contract.brandName} ${contract.modelName} (${contract.carLicensePlate}) ends on ${format(new Date(contract.endDate), "MMM dd, yyyy")}`,
                date: new Date(contract.endDate),
                read: false,
            });
        }
    });

    // Get recent contracts (last 7 days)
    const sevenDaysAgo = addDays(new Date(), -7);
    const recentContractsResult = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                c.id,
                c.created_at AS createdAt,
                c.status,
                cc.license_plate AS carLicensePlate,
                cb.name AS brandName,
                cm.name AS modelName
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            WHERE c.client_id = ? AND c.created_at >= ?
            ORDER BY c.created_at DESC
            LIMIT 5
        `)
        .bind(user.id, sevenDaysAgo.toISOString())
        .all() as { results?: any[] };
    const recentContracts = recentContractsResult.results || [];

    recentContracts.forEach((contract) => {
        notifications.push({
            id: `contract-new-${contract.id}`,
            type: "contract",
            title: "New Contract",
            message: `Your rental contract for ${contract.brandName} ${contract.modelName} (${contract.carLicensePlate}) has been created`,
            date: new Date(contract.createdAt),
            read: false,
        });
    });

    // Sort by date (newest first)
    notifications.sort((a, b) => b.date.getTime() - a.date.getTime());

    return { notifications };
}

export default function Notifications() {
    const { notifications } = useLoaderData<typeof loader>();

    const getIcon = (type: string) => {
        switch (type) {
            case "contract":
                return <TruckIcon className="h-6 w-6 text-blue-600" />;
            case "payment":
                return <CurrencyDollarIcon className="h-6 w-6 text-green-600" />;
            case "reminder":
                return <CalendarIcon className="h-6 w-6 text-orange-600" />;
            default:
                return <BellIcon className="h-6 w-6 text-gray-600" />;
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader title="Notifications" subtitle="Stay updated with your rentals" />

            <Card className="overflow-hidden shadow-sm">
                {notifications.length > 0 ? (
                    <div className="divide-y divide-gray-200">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-6 hover:bg-gray-50 transition-colors ${
                                    !notification.read ? "bg-blue-50" : ""
                                }`}
                            >
                                <div className="flex gap-4">
                                    <div className="flex-shrink-0">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-gray-900">
                                                    {notification.title}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    {format(notification.date, "MMM dd, yyyy HH:mm")}
                                                </p>
                                            </div>
                                            {!notification.read && (
                                                <span className="h-2 w-2 bg-blue-600 rounded-full"></span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <EmptyState
                        icon={<BellIcon className="h-12 w-12" />}
                        title="No notifications"
                        description="You're all caught up!"
                    />
                )}
            </Card>
        </div>
    );
}
