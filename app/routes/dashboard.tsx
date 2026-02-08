import { useState, useEffect } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Sidebar from "~/components/dashboard/Sidebar";
import Topbar from "~/components/dashboard/Topbar";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function Layout() {
    const { user } = useLoaderData<typeof loader>();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Detect mobile and close sidebar by default
    useEffect(() => {
        const checkMobile = () => {
            const isMobile = window.innerWidth < 768;
            if (isMobile) {
                setIsSidebarOpen(false);
            }
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    return (
        <div className="h-screen bg-gray-100 flex overflow-hidden">
            <Sidebar
                user={user}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
            />

            {/* Main content */}
            <div className="flex-1 overflow-y-auto">
                <Topbar
                    user={user}
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
                    isSidebarOpen={isSidebarOpen}
                />
                <main className="p-4">
                    <Outlet key={location.pathname} />
                </main>
            </div>
        </div>
    );
}
