import { useState, useEffect, createContext, useContext } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useParams, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, gte } from "drizzle-orm";
import { addDays } from "date-fns";
import * as schema from "~/db/schema";
import Sidebar from "~/components/dashboard/Sidebar";
import Topbar from "~/components/dashboard/Topbar";
import { useToast } from "~/lib/toast";

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

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    
    // Count unread notifications for all roles
    let notificationsCount = 0;
    
    try {
        const db = drizzle(context.cloudflare.env.DB, { schema });
        
        // Count upcoming contract end dates (within 3 days)
        const threeDaysFromNow = addDays(new Date(), 3);
        const upcomingContracts = await db
            .select()
            .from(schema.contracts)
            .where(
                and(
                    eq(schema.contracts.clientId, user.id),
                    eq(schema.contracts.status, "active"),
                    gte(schema.contracts.endDate, new Date())
                )
            )
            .limit(10);
        
        // Filter contracts ending within 3 days
        const upcomingCount = upcomingContracts.filter(
            c => new Date(c.endDate) <= threeDaysFromNow
        ).length;
        
        // Count recent contracts (last 7 days)
        const sevenDaysAgo = addDays(new Date(), -7);
        const recentContracts = await db
            .select()
            .from(schema.contracts)
            .where(
                and(
                    eq(schema.contracts.clientId, user.id),
                    gte(schema.contracts.createdAt, sevenDaysAgo)
                )
            )
            .limit(5);
        
        notificationsCount = upcomingCount + recentContracts.length;
    } catch {
        notificationsCount = 0;
    }
    
    return { user, notificationsCount };
}

export default function Layout() {
    const { user, notificationsCount } = useLoaderData<typeof loader>();
    const location = useLocation();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const toast = useToast();

    // Show welcome toast on login
    const loginState = searchParams.get("login");

    useEffect(() => {
        if (loginState === "success") {
            toast.success(`Welcome back, ${user.name || user.email}!`);
        }
    }, [loginState, user.name, user.email, toast]);

    // Detect mod mode from URL (direct /companies/:id or persisted query param)
    const pathCompanyId = location.pathname.startsWith("/companies/") && params.companyId
        ? Number.parseInt(params.companyId, 10)
        : null;
    const queryCompanyIdRaw = searchParams.get("modCompanyId");
    const queryCompanyId = queryCompanyIdRaw ? Number.parseInt(queryCompanyIdRaw, 10) : null;

    const resolvedModCompanyId = pathCompanyId && Number.isFinite(pathCompanyId) && pathCompanyId > 0
        ? pathCompanyId
        : queryCompanyId && Number.isFinite(queryCompanyId) && queryCompanyId > 0
            ? queryCompanyId
            : null;

    const isModMode = user.role === "admin" && resolvedModCompanyId !== null;
    const modCompanyId = isModMode ? resolvedModCompanyId : null;

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
                        notificationsCount={notificationsCount}
                    />
                    <main className="p-4">
                        <Outlet key={location.pathname} />
                    </main>
                </div>
            </div>
        </ModModeContext.Provider>
    );
}
