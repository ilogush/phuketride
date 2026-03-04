import { useState, useEffect, createContext, useContext } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
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
    let notificationsCount = 0;

    // Only user dashboard needs personal notifications badge.
    if (user.role === "user") {
        try {
            const nowIso = new Date().toISOString();
            const threeDaysFromNowIso = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
            const sevenDaysAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            const [upcomingCountRow, recentCountRow] = await Promise.all([
                context.cloudflare.env.DB
                    .prepare(`
                        SELECT COUNT(*) AS count
                        FROM contracts
                        WHERE client_id = ?
                          AND status = 'active'
                          AND end_date >= ?
                          AND end_date <= ?
                    `)
                    .bind(user.id, nowIso, threeDaysFromNowIso)
                    .first() as Promise<{ count?: number } | null>,
                context.cloudflare.env.DB
                    .prepare(`
                        SELECT COUNT(*) AS count
                        FROM contracts
                        WHERE client_id = ? AND created_at >= ?
                    `)
                    .bind(user.id, sevenDaysAgoIso)
                    .first() as Promise<{ count?: number } | null>,
            ]);

            notificationsCount = Number(upcomingCountRow?.count || 0) + Number(recentCountRow?.count || 0);
        } catch {
            notificationsCount = 0;
        }
    }

    return { user, notificationsCount };
}

export default function Layout() {
    const { user, notificationsCount } = useLoaderData<typeof loader>();
    const location = useLocation();
    const params = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const toast = useToast();

    // Show welcome toast on login
    const loginState = searchParams.get("login");

    useEffect(() => {
        if (loginState === "success") {
            const welcomeKey = `welcome-shown:${user.id}`;
            if (sessionStorage.getItem(welcomeKey) === "1") {
                return;
            }
            sessionStorage.setItem(welcomeKey, "1");
            toast.success(`Welcome back, ${user.name || user.email}!`);

            const nextParams = new URLSearchParams(searchParams);
            nextParams.delete("login");
            navigate(
                `${location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}`,
                { replace: true }
            );
        }
    }, [loginState, user.id, user.name, user.email, toast, searchParams, navigate, location.pathname]);

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
                        <Outlet />
                    </main>
                </div>
            </div>
        </ModModeContext.Provider>
    );
}
