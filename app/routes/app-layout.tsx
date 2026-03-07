import { createContext, useContext } from "react";
import { type LoaderFunctionArgs, isRouteErrorResponse, useRouteError } from "react-router";
import { Outlet, useLoaderData } from "react-router";
import Sidebar from "~/components/dashboard/Sidebar";
import Topbar from "~/components/dashboard/Topbar";
import { loadAppLayoutData } from "~/lib/app-layout.server";
import { useToast } from "~/lib/toast";
import { useUrlToast } from "~/lib/useUrlToast";
import type { ModModeContextType } from "./app-layout.types";
import { useAppLayoutModMode } from "~/hooks/useAppLayoutModMode";
import { useAppLayoutSidebar } from "~/hooks/useAppLayoutSidebar";
import { useAppLayoutWelcomeToast } from "~/hooks/useAppLayoutWelcomeToast";

const ModModeContext = createContext<ModModeContextType>({
    isModMode: false,
    modCompanyId: null,
});

export function useModMode() {
    return useContext(ModModeContext);
}

import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { sdb } = await getScopedDb(request, context);
    return await loadAppLayoutData({
        request,
        db: sdb.db as any,
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

export function ErrorBoundary() {
    const error = useRouteError();
    let title = "Something went wrong";
    let message = "Please try refreshing the page.";

    if (isRouteErrorResponse(error)) {
        if (error.status === 401 || error.status === 403) {
            title = "Access denied";
            message = "You don't have permission to view this page.";
        } else if (error.status === 404) {
            title = "Page not found";
            message = "The page you're looking for doesn't exist.";
        } else {
            message = error.statusText || message;
        }
    }

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md w-full shadow-sm text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h1 className="text-lg font-semibold text-gray-900 mb-2">{title}</h1>
                <p className="text-sm text-gray-500 mb-6">{message}</p>
                <a
                    href="/home"
                    className="inline-flex items-center rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                    Back to dashboard
                </a>
            </div>
        </div>
    );
}
