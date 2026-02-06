import { useState } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Sidebar from "~/components/layout/Sidebar";
import Topbar from "~/components/layout/Topbar";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function DashboardLayout() {
    const { user } = useLoaderData<typeof loader>();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="min-h-screen bg-gray-50 flex">
            <Sidebar user={user} isOpen={isSidebarOpen} />

            {/* Main content */}
            <div className="flex-1 ml-0 flex flex-col">
                <Topbar
                    user={user}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    isSidebarOpen={isSidebarOpen}
                />
                <main className="flex-1 p-4">
                    <Outlet key={location.pathname} />
                </main>
            </div>
        </div>
    );
}
