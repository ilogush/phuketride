import { createContext, useContext } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import Sidebar from "~/components/dashboard/Sidebar";
import Topbar from "~/components/dashboard/Topbar";
import { loadAppLayoutData } from "~/lib/app-layout.server";
import { useToast } from "~/lib/toast";
import { useUrlToast } from "~/lib/useUrlToast";
import type { ModModeContextType } from "./app-layout.types";
import { useAppLayoutModMode } from "./useAppLayoutModMode";
import { useAppLayoutSidebar } from "./useAppLayoutSidebar";
import { useAppLayoutWelcomeToast } from "./useAppLayoutWelcomeToast";

const ModModeContext = createContext<ModModeContextType>({
    isModMode: false,
    modCompanyId: null,
});

export function useModMode() {
    return useContext(ModModeContext);
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    return await loadAppLayoutData({
        request,
        db: context.cloudflare.env.DB,
    });
}

export default function Layout() {
    const { user, notificationsCount } = useLoaderData<typeof loader>();
    const toast = useToast();
    useUrlToast();
    const { isModMode, modCompanyId } = useAppLayoutModMode({ role: user.role });
    const { closeSidebar, isSidebarOpen, toggleSidebar } = useAppLayoutSidebar();

    useAppLayoutWelcomeToast({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
        },
        success: toast.success,
    });

    return (
        <ModModeContext.Provider value={{ isModMode, modCompanyId }}>
            <div className="h-screen bg-gray-100 flex overflow-hidden">
                <Sidebar
                    user={user}
                    isOpen={isSidebarOpen}
                    onClose={closeSidebar}
                    isModMode={isModMode}
                    modCompanyId={modCompanyId}
                />

                {/* Main content */}
                <div className="flex-1 overflow-y-auto">
                    <Topbar
                        user={user}
                        onToggleSidebar={toggleSidebar}
                        isSidebarOpen={isSidebarOpen}
                        notificationsCount={notificationsCount}
                    />
                    <main className="p-4">
                        <Outlet />
                    </main>
                </div>
            </div>
        </ModModeContext.Provider>
    );
}
