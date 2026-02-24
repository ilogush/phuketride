import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Link, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import StatusBadge from "~/components/dashboard/StatusBadge";
import DataTable from "~/components/dashboard/DataTable";
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

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const companyId = parseInt(params.companyId || "0");

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
    let vehicles: any[] = [];
    let teamMembers: any[] = [];

    try {
        company = await context.cloudflare.env.DB
            .prepare("SELECT * FROM companies WHERE id = ? LIMIT 1")
            .bind(companyId)
            .first<any>();

        if (!company) {
            throw new Response("Company not found", { status: 404 });
        }

        const nowIso = new Date().toISOString();
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthStartIso = monthStart.toISOString();

        const [
            totalVehicles,
            inWorkshop,
            activeBookings,
            upcomingBookings,
            totalRevenue,
            thisMonthRevenue,
            totalCustomers,
        ] = await Promise.all([
            context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM company_cars WHERE company_id = ?").bind(companyId).first<any>(),
            context.cloudflare.env.DB.prepare("SELECT COUNT(*) AS count FROM company_cars WHERE company_id = ? AND status = 'maintenance'").bind(companyId).first<any>(),
            context.cloudflare.env.DB
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ? AND c.status = 'active'
                `)
                .bind(companyId)
                .first<any>(),
            context.cloudflare.env.DB
                .prepare(`
                    SELECT COUNT(*) AS count
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ? AND c.start_date >= ?
                `)
                .bind(companyId, nowIso)
                .first<any>(),
            context.cloudflare.env.DB
                .prepare(`
                    SELECT COALESCE(SUM(p.amount), 0) AS sum
                    FROM payments p
                    JOIN contracts c ON c.id = p.contract_id
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                `)
                .bind(companyId)
                .first<any>(),
            context.cloudflare.env.DB
                .prepare(`
                    SELECT COALESCE(SUM(p.amount), 0) AS sum
                    FROM payments p
                    JOIN contracts c ON c.id = p.contract_id
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ? AND p.created_at >= ?
                `)
                .bind(companyId, monthStartIso)
                .first<any>(),
            context.cloudflare.env.DB
                .prepare(`
                    SELECT COUNT(DISTINCT c.client_id) AS count
                    FROM contracts c
                    JOIN company_cars cc ON cc.id = c.company_car_id
                    WHERE cc.company_id = ?
                `)
                .bind(companyId)
                .first<any>(),
        ]);

        stats = {
            totalVehicles: totalVehicles?.count || 0,
            inWorkshop: inWorkshop?.count || 0,
            activeBookings: activeBookings?.count || 0,
            upcomingBookings: upcomingBookings?.count || 0,
            totalRevenue: totalRevenue?.sum || 0,
            thisMonthRevenue: thisMonthRevenue?.sum || 0,
            totalCustomers: totalCustomers?.count || 0,
        };

        // Load vehicles
        const vehiclesData = await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    cc.id,
                    cc.license_plate AS licensePlate,
                    cc.year,
                    cc.price_per_day AS pricePerDay,
                    cc.status,
                    cc.mileage,
                    cb.name AS brandName,
                    cm.name AS modelName
                FROM company_cars cc
                LEFT JOIN car_models cm ON cm.id = cc.template_id
                LEFT JOIN car_brands cb ON cb.id = cm.brand_id
                WHERE cc.company_id = ?
                ORDER BY cc.created_at DESC
                LIMIT 100
            `)
            .bind(companyId)
            .all() as { results?: any[] };
        vehicles = vehiclesData.results || [];

        // Load team members (managers + owner)
        const [ownerData, managersData] = await Promise.all([
            context.cloudflare.env.DB
                .prepare(`
                    SELECT id, name, surname, email, phone, avatar_url AS avatarUrl, 'owner' AS role
                    FROM users
                    WHERE id = ?
                    LIMIT 1
                `)
                .bind(company.owner_id)
                .all(),
            context.cloudflare.env.DB
                .prepare(`
                    SELECT u.id, u.name, u.surname, u.email, u.phone, u.avatar_url AS avatarUrl, 'manager' AS role
                    FROM managers m
                    JOIN users u ON u.id = m.user_id
                    WHERE m.company_id = ? AND m.is_active = 1
                `)
                .bind(companyId)
                .all(),
        ]);
        teamMembers = [...((ownerData as any).results || []), ...((managersData as any).results || [])];

        // Load recent activity (calendar events)
        const activityData = await context.cloudflare.env.DB
            .prepare(`
                SELECT id, title, description, start_date AS startDate, status
                FROM calendar_events
                WHERE company_id = ? AND status = 'pending'
                ORDER BY start_date DESC
                LIMIT 10
            `)
            .bind(companyId)
            .all() as { results?: any[] };
        recentActivity = activityData.results || [];
    } catch {
        company = null;
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

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    
    if (user.role !== "admin") {
        return redirect(`/dashboard/companies/${params.companyId}?error=Access denied`);
    }

    const formData = await request.formData();
    const intent = formData.get("intent");
    const companyId = parseInt(params.companyId || "0");

    if (intent === "archive") {
        const { archiveCompany } = await import("~/lib/archive.server");
        const result = await archiveCompany(context.cloudflare.env.DB, companyId);
        
        if (result.success) {
            return redirect(`/dashboard/companies?success=${encodeURIComponent(result.message || "Company archived successfully")}`);
        } else {
            return redirect(`/dashboard/companies/${companyId}?error=${encodeURIComponent(result.message || result.error || "Failed to archive company")}`);
        }
    }

    if (intent === "unarchive") {
        const { unarchiveCompany } = await import("~/lib/archive.server");
        const result = await unarchiveCompany(context.cloudflare.env.DB, companyId);
        
        if (result.success) {
            return redirect(`/dashboard/companies/${companyId}?success=${encodeURIComponent(result.message || "Company unarchived successfully")}`);
        } else {
            return redirect(`/dashboard/companies/${companyId}?error=${encodeURIComponent(result.message || result.error || "Failed to unarchive company")}`);
        }
    }

    return redirect(`/dashboard/companies/${companyId}`);
}

export default function CompanyDetailPage() {
    const { company, stats, vehicles, teamMembers, recentActivity } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string>("overview");

    if (!company) {
        return (
            <div className="space-y-4">
                <PageHeader title="Company Not Found" />
                <div className="text-center py-12">
                    <p className="text-gray-500">The company you are looking for does not exist.</p>
                    <Link to="/companies" className="mt-4 inline-block">
                        <Button variant="secondary">
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Back to Companies
                        </Button>
                    </Link>
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
            render: (vehicle: any) => (
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                    {String(vehicle.id).padStart(4, "0")}
                </span>
            ),
        },
        {
            key: "make",
            label: "Make",
            render: (vehicle: any) => (
                <div className="flex items-center gap-2">
                    <span>{vehicle.brandName || "-"}</span>
                    <span className="text-gray-400">{vehicle.modelName || ""}</span>
                </div>
            ),
        },
        {
            key: "licensePlate",
            label: "License Plate",
            render: (vehicle: any) => (
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
            render: (vehicle: any) => `฿${(vehicle.pricePerDay || 0).toLocaleString()}`,
        },
        {
            key: "status",
            label: "Status",
            render: (vehicle: any) => {
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
            render: (member: any) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-sm">
                            {`${member.name?.[0] || ""}${member.surname?.[0] || ""}`}
                        </span>
                    </div>
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
            render: (member: any) => member.phone || "-",
        },
        {
            key: "role",
            label: "Role",
            render: (member: any) => (
                <span className="capitalize text-gray-600">{member.role}</span>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            {/* Back button */}
            <Link 
                to="/companies" 
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
                    <div className="flex gap-2">
                        {company.archivedAt ? (
                            <Form method="post">
                                <input type="hidden" name="intent" value="unarchive" />
                                <Button type="submit" variant="primary">
                                    Unarchive
                                </Button>
                            </Form>
                        ) : (
                            <Form method="post">
                                <input type="hidden" name="intent" value="archive" />
                                <Button type="submit" variant="secondary">
                                    Archive
                                </Button>
                            </Form>
                        )}
                        <Button variant="secondary">Edit Profile</Button>
                    </div>
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
                                    <p className="text-sm text-gray-500">Total Vehicles</p>
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
                                    <p className="text-sm text-gray-500">Active Bookings</p>
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
                                    <p className="text-sm text-gray-500">Revenue</p>
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
                                    <p className="text-sm text-gray-500">Customers</p>
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
    );
}
