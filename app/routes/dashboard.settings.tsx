import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/ui/PageHeader";
import Card from "~/components/ui/Card";
import { Cog6ToothIcon, ShieldCheckIcon, BellIcon, CreditCardIcon } from "@heroicons/react/24/outline";
import Button from "~/components/ui/Button";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function SettingsPage() {
    const { user } = useLoaderData<typeof loader>();

    const sections = [
        { name: "General Settings", icon: Cog6ToothIcon, description: "Manage site-wide configurations and defaults" },
        { name: "Security & Access", icon: ShieldCheckIcon, description: "Password policies and login security" },
        { name: "Notifications", icon: BellIcon, description: "Configure email and push notification preferences" },
        { name: "Billing & Plans", icon: CreditCardIcon, description: "Manage subscriptions and payment methods" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader title="Settings" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section) => (
                    <Card key={section.name} className="p-6 border-gray-200 hover:border-gray-300 transition-colors cursor-pointer group">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gray-50 rounded-2xl group-hover:bg-gray-100 transition-colors">
                                <section.icon className="w-6 h-6 text-gray-800" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-gray-900">{section.name}</h3>
                                <p className="text-sm text-gray-500 mt-1">{section.description}</p>
                            </div>
                            <Button variant="secondary" size="sm">Manage</Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
