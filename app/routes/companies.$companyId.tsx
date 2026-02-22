import { type LoaderFunctionArgs, redirect } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Button from "~/components/dashboard/Button";
import StatusBadge from "~/components/dashboard/StatusBadge";
import DataTable from "~/components/dashboard/DataTable";
import Sidebar from "~/components/dashboard/Sidebar";
import Topbar from "~/components/dashboard/Topbar";
import Avatar from "~/components/dashboard/Avatar";
import Tabs from "~/components/dashboard/Tabs";
import { 
    ArrowLeftIcon,
    TruckIcon,
    CalendarIcon,
    UserGroupIcon,
    BanknotesIcon,
    ClockIcon,
    ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";

// Type definitions for vehicle and member data
interface Vehicle {
    id: number;
    licensePlate: string;
    year: number | null;
    pricePerDay: number | null;
    status: string | null;
    mileage: number | null;
    brandName: string | null;
    modelName: string | null;
}

interface TeamMember {
    id: string;
    name: string | null;
    surname: string | null;
    email: string;
    phone: string | null;
    role: string;
    avatarUrl: string | null;
}

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const d1 = context.cloudflare.env.DB;
    const companyId = Number.parseInt(params.companyId || "0", 10);

    if (!Number.isFinite(companyId) || companyId <= 0) {
        throw new Response("Invalid company id", { status: 400 });
    }

    // Admin opens company page in mod mode as partner dashboard.
    if (user.role === "admin") {
        return redirect(`/dashboard?modCompanyId=${companyId}`);
    }

    let company: any = null;
    let stats = {
        totalVehicles: 0,
        inWorkshop: 0,
        activeBookings: 0,
        upcomingBookings: 0,
        totalRevenue: 0,
        thisMonthRevenue: 0,
        totalCustomers: 0,
    };
    let recentActivity: any[] = [];
    let vehicles: Vehicle[] = [];
    let teamMembers: TeamMember[] = [];

    try {
        // Load company info
        const companyData = await d1
            .prepare("SELECT * FROM companies WHERE id = ? LIMIT 1")
            .bind(companyId)
            .all();

        company = (companyData.results?.[0] as Record<string, unknown> | undefined) || null;

        if (!company) {
            throw new Response("Company not found", { status: 404 });
        }

        // Load stats
        const totalVehicles = await d1
            .prepare("SELECT count(*) as count FROM company_cars WHERE company_id = ?")
            .bind(companyId)
            .all();

        const inWorkshop = await d1
            .prepare("SELECT count(*) as count FROM company_cars WHERE company_id = ? AND status = 'maintenance'")
            .bind(companyId)
            .all();

        const activeBookings = await d1
            .prepare(
                `
                SELECT count(*) as count
                FROM contracts c
                INNER JOIN company_cars cc ON c.company_car_id = cc.id
                WHERE cc.company_id = ? AND c.status = 'active'
                `
            )
            .bind(companyId)
            .all();

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);

        // Get upcoming bookings (future start date)
        const upcomingBookings = await d1
            .prepare(
                `
                SELECT count(*) as count
                FROM contracts c
                INNER JOIN company_cars cc ON c.company_car_id = cc.id
                WHERE cc.company_id = ? AND c.start_date >= ?
                `
            )
            .bind(companyId, now.getTime())
            .all();

        // Get total revenue
        const totalRevenue = await d1
            .prepare(
                `
                SELECT coalesce(sum(p.amount), 0) as sum
                FROM payments p
                INNER JOIN contracts c ON p.contract_id = c.id
                INNER JOIN company_cars cc ON c.company_car_id = cc.id
                WHERE cc.company_id = ?
                `
            )
            .bind(companyId)
            .all();

        // Get this month revenue
        const thisMonthRevenue = await d1
            .prepare(
                `
                SELECT coalesce(sum(p.amount), 0) as sum
                FROM payments p
                INNER JOIN contracts c ON p.contract_id = c.id
                INNER JOIN company_cars cc ON c.company_car_id = cc.id
                WHERE cc.company_id = ? AND p.created_at >= ?
                `
            )
            .bind(companyId, startOfMonth.getTime())
            .all();

        // Get total unique customers
        const totalCustomers = await d1
            .prepare(
                `
                SELECT count(distinct c.client_id) as count
                FROM contracts c
                INNER JOIN company_cars cc ON c.company_car_id = cc.id
                WHERE cc.company_id = ?
                `
            )
            .bind(companyId)
            .all();

        const totalVehiclesRow = (totalVehicles.results?.[0] as Record<string, unknown> | undefined) || {};
        const inWorkshopRow = (inWorkshop.results?.[0] as Record<string, unknown> | undefined) || {};
        const activeBookingsRow = (activeBookings.results?.[0] as Record<string, unknown> | undefined) || {};
        const upcomingBookingsRow = (upcomingBookings.results?.[0] as Record<string, unknown> | undefined) || {};
        const totalRevenueRow = (totalRevenue.results?.[0] as Record<string, unknown> | undefined) || {};
        const thisMonthRevenueRow = (thisMonthRevenue.results?.[0] as Record<string, unknown> | undefined) || {};
        const totalCustomersRow = (totalCustomers.results?.[0] as Record<string, unknown> | undefined) || {};

        stats = {
            totalVehicles: Number(totalVehiclesRow.count || 0),
            inWorkshop: Number(inWorkshopRow.count || 0),
            activeBookings: Number(activeBookingsRow.count || 0),
            upcomingBookings: Number(upcomingBookingsRow.count || 0),
            totalRevenue: Number(totalRevenueRow.sum || 0),
            thisMonthRevenue: Number(thisMonthRevenueRow.sum || 0),
            totalCustomers: Number(totalCustomersRow.count || 0),
        };

        // Load vehicles
        const vehiclesData = await d1
            .prepare(
                `
                SELECT
                  cc.id AS id,
                  cc.license_plate AS licensePlate,
                  cc.year AS year,
                  cc.price_per_day AS pricePerDay,
                  cc.status AS status,
                  cc.mileage AS mileage,
                  cb.name AS brandName,
                  cm.name AS modelName
                FROM company_cars cc
                LEFT JOIN car_models cm ON cc.template_id = cm.id
                LEFT JOIN car_brands cb ON cm.brand_id = cb.id
                WHERE cc.company_id = ?
                ORDER BY cc.created_at DESC
                LIMIT 100
                `
            )
            .bind(companyId)
            .all();

        vehicles = ((vehiclesData.results ?? []) as Array<Record<string, unknown>>).map((row) => ({
            id: Number(row.id),
            licensePlate: String(row.licensePlate || ""),
            year: row.year === null ? null : Number(row.year),
            pricePerDay: row.pricePerDay === null ? null : Number(row.pricePerDay),
            status: (row.status as string | null) ?? null,
            mileage: row.mileage === null ? null : Number(row.mileage),
            brandName: (row.brandName as string | null) ?? null,
            modelName: (row.modelName as string | null) ?? null,
        }));

        // Load team members (managers + owner)
        const ownerData = await d1
            .prepare(
                `
                SELECT
                  id, name, surname, email, phone,
                  'owner' as role,
                  avatar_url as avatarUrl
                FROM users
                WHERE id = ?
                LIMIT 1
                `
            )
            .bind(company.owner_id)
            .all();

        const managersData = await d1
            .prepare(
                `
                SELECT
                  u.id as id,
                  u.name as name,
                  u.surname as surname,
                  u.email as email,
                  u.phone as phone,
                  'manager' as role,
                  u.avatar_url as avatarUrl
                FROM managers m
                INNER JOIN users u ON m.user_id = u.id
                WHERE m.company_id = ? AND m.is_active = 1
                `
            )
            .bind(companyId)
            .all();

        teamMembers = [
            ...((ownerData.results ?? []) as TeamMember[]),
            ...((managersData.results ?? []) as TeamMember[]),
        ];

        // Load recent activity (calendar events)
        const activityData = await d1
            .prepare(
                `
                SELECT
                  id, title, description,
                  start_date as startDate,
                  status
                FROM calendar_events
                WHERE company_id = ? AND status = 'pending'
                ORDER BY start_date DESC
                LIMIT 10
                `
            )
            .bind(companyId)
            .all();

        recentActivity = (activityData.results ?? []) as any[];

    } catch {
        // Keep page resilient and show empty states if partial loading fails
    }

    return { 
        user, 
        company, 
        stats, 
        vehicles, 
        teamMembers,
        recentActivity 
    };
}

export default function CompanyDetailPage() {
    const { user, company, stats, vehicles, teamMembers, recentActivity } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const isAdminModMode = user.role === "admin" && company?.id;

    if (!company) {
        return (
            <div className="min-h-screen bg-gray-100 flex">
                <Sidebar user={user} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                <div className="flex-1 overflow-y-auto">
                    <Topbar user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
                    <main className="p-4">
                        <div className="bg-white rounded-3xl border border-gray-200 p-6">
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">Company Not Found</h1>
                            <p className="text-gray-500">The company you are looking for does not exist.</p>
                            <Link to="/companies" className="mt-4 inline-block">
                                <Button variant="secondary">
                                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                                    Back to Companies
                                </Button>
                            </Link>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const tabs: { id: string; label: string }[] = [
        { id: "overview", label: "Overview" },
        { id: "vehicles", label: `Vehicles (${vehicles.length})` },
        { id: "team", label: `Team (${teamMembers.length})` },
    ];

    const vehicleColumns = [
        {
            key: "id",
            label: "ID",
            render: (vehicle: Vehicle) => (
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                    {String(vehicle.id).padStart(4, "0")}
                </span>
            ),
        },
        {
            key: "make",
            label: "Make",
            render: (vehicle: Vehicle) => (
                <div className="flex items-center gap-2">
                    <span>{vehicle.brandName || "-"}</span>
                    <span className="text-gray-400">{vehicle.modelName || ""}</span>
                </div>
            ),
        },
        {
            key: "licensePlate",
            label: "License Plate",
            render: (vehicle: Vehicle) => (
                <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                    {vehicle.licensePlate}
                </span>
            ),
        },
        {
            key: "year",
            label: "Year",
        },
        {
            key: "pricePerDay",
            label: "Price",
            render: (vehicle: Vehicle) => `฿${(vehicle.pricePerDay || 0).toLocaleString()}`,
        },
        {
            key: "status",
            label: "Status",
            render: (vehicle: Vehicle) => {
                const status = vehicle.status || "available";
                const variant = status === "available" ? "success" : 
                    status === "rented" ? "warning" : 
                    status === "maintenance" ? "error" : "neutral";
                return <StatusBadge variant={variant}>{status}</StatusBadge>;
            },
        },
    ];

    const teamColumns = [
        {
            key: "member",
            label: "Member",
            render: (member: TeamMember) => (
                <div className="flex items-center gap-3">
                    <Avatar 
                        src={member.avatarUrl} 
                        initials={`${member.name?.[0] || ""}${member.surname?.[0] || ""}`} 
                        size="sm" 
                    />
                    <div>
                        <p className="font-medium text-gray-900">{member.name} {member.surname}</p>
                        <p className="text-sm text-gray-500">{member.email}</p>
                    </div>
                </div>
            ),
        },
        {
            key: "phone",
            label: "Phone",
            render: (member: TeamMember) => member.phone || "-",
        },
        {
            key: "role",
            label: "Role",
            render: (member: TeamMember) => (
                <span className="capitalize text-gray-600">{member.role}</span>
            ),
        },
    ];

    return (
        <div className="min-h-screen bg-gray-100">
            <Sidebar
                user={user}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                isModMode={Boolean(isAdminModMode)}
                modCompanyId={isAdminModMode ? company.id : null}
            />
            <div className="flex-1 overflow-y-auto">
                <Topbar user={user} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} isSidebarOpen={isSidebarOpen} />
                <main className="p-4">
                    <div className="space-y-6">
                        {/* Back button */}
                        <Link 
                            to="/dashboard/companies" 
                            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            <ArrowLeftIcon className="w-5 h-5" />
                            <span>Companies</span>
                        </Link>

                        {/* Company Header */}
                        <div className="bg-white rounded-3xl border border-gray-200 p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
                                        <span className="text-white text-2xl font-bold">
                                            {company.name?.charAt(0) || "C"}
                                        </span>
                                    </div>
                                    <div>
                                        <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                                        <p className="text-gray-500">{company.email}</p>
                                    </div>
                                </div>
                                <Button variant="secondary">Edit Profile</Button>
                            </div>

                            {/* Tabs */}
                            <div className="mt-6 border-b border-gray-200">
                                <Tabs 
                                    tabs={tabs} 
                                    activeTab={activeTab} 
                                    onTabChange={(id) => setActiveTab(id as string)} 
                                />
                            </div>
                        </div>

                        {/* Tab Content */}
                        {activeTab === "overview" && (
                            <div className="space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                    {/* Total Vehicles */}
                                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Total Vehicles</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                                    {stats.totalVehicles}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {stats.inWorkshop} in workshop
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                                                <TruckIcon className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Active Bookings */}
                                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Active Bookings</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                                    {stats.activeBookings}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {stats.upcomingBookings} upcoming
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                                                <CalendarIcon className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Revenue */}
                                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Revenue</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                                    ฿{stats.totalRevenue.toLocaleString()}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    ฿{stats.thisMonthRevenue.toLocaleString()} this month
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                                                <BanknotesIcon className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customers */}
                                    <div className="bg-white rounded-2xl border border-gray-200 p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-500">Customers</p>
                                                <p className="text-3xl font-bold text-gray-900 mt-1">
                                                    {stats.totalCustomers}
                                                </p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    Total customers
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                                                <UserGroupIcon className="w-6 h-6 text-white" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Recent Activity */}
                                <div className="bg-white rounded-3xl border border-gray-200 p-6">
                                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
                                    {recentActivity.length > 0 ? (
                                        <div className="space-y-4">
                                            {recentActivity.map((activity) => (
                                                <div key={activity.id} className="flex items-start gap-3">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <ClockIcon className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-medium text-gray-900">{activity.title}</p>
                                                        {activity.description && (
                                                            <p className="text-sm text-gray-500 mt-0.5">{activity.description}</p>
                                                        )}
                                                        <p className="text-xs text-gray-400 mt-1">
                                                            {new Date(activity.startDate).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                    <ArrowRightIcon className="w-5 h-5 text-gray-400" />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 text-center py-8">No recent activity</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === "vehicles" && (
                            <DataTable
                                data={vehicles}
                                columns={vehicleColumns}
                                totalCount={vehicles.length}
                                emptyTitle="No vehicles found"
                                emptyDescription="Vehicles will appear here when added to this company"
                            />
                        )}

                        {activeTab === "team" && (
                            <DataTable
                                data={teamMembers}
                                columns={teamColumns}
                                totalCount={teamMembers.length}
                                emptyTitle="No team members found"
                                emptyDescription="Team members will appear here"
                            />
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
