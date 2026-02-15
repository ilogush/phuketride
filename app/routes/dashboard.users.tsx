import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { users } from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let usersList: any[] = [];
    let roleCounts = { all: 0, admin: 0, partner: 0, manager: 0, user: 0 };

    try {
        if (user.role === "partner") {
            // Partner can only see managers and users from their company
            // First, get partner's company
            const companyResult = await context.cloudflare.env.DB
                .prepare("SELECT id FROM companies WHERE owner_id = ? LIMIT 1")
                .bind(user.id)
                .first() as { id: number } | null;

            if (!companyResult) {
                return { user, users: [], roleCounts };
            }

            const companyId = companyResult.id;

            // Get managers from this company
            const managersResult = await context.cloudflare.env.DB
                .prepare(`
                    SELECT u.id, u.email, u.name, u.surname, u.role, u.phone
                    FROM users u
                    INNER JOIN managers m ON u.id = m.user_id
                    WHERE m.company_id = ? AND m.is_active = 1
                `)
                .bind(companyId)
                .all() as { results?: any[] };

            // Get users (clients) - for now, all users
            // TODO: Add company_id to contracts/bookings to filter users by company
            const usersResult = await context.cloudflare.env.DB
                .prepare(`
                    SELECT id, email, name, surname, role, phone
                    FROM users
                    WHERE role = 'user'
                    LIMIT 50
                `)
                .all() as { results?: any[] };

            usersList = [...(managersResult.results || []), ...(usersResult.results || [])];
        } else {
            // Admin can see all users
            usersList = await db.select({
                id: users.id,
                email: users.email,
                name: users.name,
                surname: users.surname,
                role: users.role,
                phone: users.phone,
            }).from(users).limit(50);
        }

        roleCounts.all = usersList.length;
        roleCounts.admin = usersList.filter(u => u.role === "admin").length;
        roleCounts.partner = usersList.filter(u => u.role === "partner").length;
        roleCounts.manager = usersList.filter(u => u.role === "manager").length;
        roleCounts.user = usersList.filter(u => u.role === "user").length;
    } catch (error) {
        console.error("Error loading users:", error);
        return { user, users: [], roleCounts };
    }

    return { user, users: usersList, roleCounts };
}

export default function UsersPage() {
    const { user, users: usersList, roleCounts } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const isPartner = user.role === "partner";
    
    const [activeTab, setActiveTab] = useState<string | number>(isPartner ? "manager" : "admin");

    // Toast notifications
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success) {
            toast.success(success);
        }
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    const tabs = isPartner
        ? [
            { id: "manager", label: "Manager", count: roleCounts.manager },
            { id: "user", label: "User", count: roleCounts.user },
        ]
        : [
            { id: "admin", label: "Admin", count: roleCounts.admin },
            { id: "partner", label: "Partner", count: roleCounts.partner },
            { id: "manager", label: "Manager", count: roleCounts.manager },
            { id: "user", label: "User", count: roleCounts.user },
        ];

    const filteredUsers = usersList?.filter(u => u.role === activeTab) || [];

    const columns: Column<typeof usersList[0]>[] = [
        {
            key: "name",
            label: "Name",
            render: (user) => {
                const initials = `${user.name?.[0] || ''}${user.surname?.[0] || ''}`.toUpperCase();
                const fullName = user.name || "-";
                const surname = user.surname || "";

                return (
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                            {initials || "?"}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-medium">{fullName}</span>
                            {surname && <span className="text-sm text-gray-500">{surname}</span>}
                        </div>
                    </div>
                );
            }
        },
        { key: "email", label: "Email" },
        {
            key: "phone",
            label: "Phone",
            render: (user) => user.phone || "-"
        },
        {
            key: "role",
            label: "Role",
            render: (user) => <StatusBadge variant="info">{user.role}</StatusBadge>
        },
        {
            key: "actions",
            label: "Actions",
            render: (user) => (
                <div className="flex gap-2">
                    <Link to={`/users/${user.id}`}>
                        <Button type="button" variant="secondary" size="sm">
                            View
                        </Button>
                    </Link>
                    <Link to={`/users/${user.id}/edit`}>
                        <Button type="button" variant="secondary" size="sm">
                            Edit
                        </Button>
                    </Link>
                </div>
            ),
        },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Users Management"
                rightActions={
                    <Link to="/users/create">
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add
                        </Button>
                    </Link>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <DataTable
                data={filteredUsers}
                columns={columns}
                totalCount={filteredUsers.length}
                emptyTitle="No users found"
                emptyDescription={`No users with role "${activeTab}"`}
                emptyIcon={<UserGroupIcon className="w-16 h-16" />}
            />
        </div>
    );
}
