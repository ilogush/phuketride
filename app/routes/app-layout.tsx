import { useState, useEffect, createContext, useContext } from "react";
import { type LoaderFunctionArgs } from "react-router";
import { Outlet, useLoaderData, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Sidebar from "~/components/dashboard/Sidebar";
import Topbar from "~/components/dashboard/Topbar";
import { useToast } from "~/lib/toast";
import { getUserNotificationsCount, getUserNotificationWindows } from "~/lib/user-notifications.server";

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
    const sessionUser = await requireAuth(request);
    let user = sessionUser;
    let notificationsCount = 0;

    try {
        const currentUser = await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    avatar_url AS avatarUrl,
                    name,
                    surname
                FROM users
                WHERE id = ?
                LIMIT 1
            `)
            .bind(sessionUser.id)
            .first() as { avatarUrl?: string | null; name?: string | null; surname?: string | null } | null;

        if (currentUser) {
            user = {
                ...sessionUser,
                avatarUrl: currentUser.avatarUrl ?? sessionUser.avatarUrl ?? null,
                name: currentUser.name ?? sessionUser.name,
                surname: currentUser.surname ?? sessionUser.surname,
            };
        }
    } catch {
        user = sessionUser;
    }

    // Only user dashboard needs personal notifications badge.
    if (user.role === "user") {
        try {
            const windows = getUserNotificationWindows();
            notificationsCount = await getUserNotificationsCount(context.cloudflare.env.DB, user.id, windows);
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
