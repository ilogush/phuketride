import { useState, useEffect, createContext, useContext } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Sidebar from "~/components/dashboard/Sidebar";
import Topbar from "~/components/dashboard/Topbar";

// Create context for mod mode
interface ModModeContextType {
    isModMode: boolean;
    modCompanyId: number | null;
}

const ModModeContext = createContext<ModModeContextType>({
    isModMode: false,
    modCompanyId: null,
});

export function useModMode() {
    return useContext(ModModeContext);
}

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export default function Layout() {
    const { user } = useLoaderData<typeof loader>();
    const location = useLocation();
    const params = useParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    // Detect mod mode from URL
    const isModMode = !!(location.pathname.startsWith("/companies/") && 
        params.companyId && 
        user.role === "admin");
    const modCompanyId = isModMode ? parseInt(params.companyId || "0") : null;

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
        <ModModeContext.Provider value={{ isModMode, modCompanyId }}>
            <div className="h-screen bg-gray-100 flex overflow-hidden">
                <Sidebar
                    user={user}
                    isOpen={isSidebarOpen}
                    onClose={() => setIsSidebarOpen(false)}
                    isModMode={isModMode}
                    modCompanyId={modCompanyId}
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
        </ModModeContext.Provider>
    );
}
