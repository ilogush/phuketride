import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { users } from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Button from "~/components/dashboard/Button";
import { UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let usersList: any[] = [];
    let roleCounts = { all: 0, admin: 0, partner: 0, manager: 0, user: 0 };

    try {
        usersList = await db.select({
            id: users.id,
            email: users.email,
            name: users.name,
            surname: users.surname,
            role: users.role,
            phone: users.phone,
        }).from(users).limit(50);

        roleCounts.all = usersList.length;
        roleCounts.admin = usersList.filter(u => u.role === "admin").length;
        roleCounts.partner = usersList.filter(u => u.role === "partner").length;
        roleCounts.manager = usersList.filter(u => u.role === "manager").length;
        roleCounts.user = usersList.filter(u => u.role === "user").length;
    } catch (error) {
        console.error("Error loading users:", error);
        // Return empty data on error instead of throwing
        return { user, users: [], roleCounts };
    }

    return { user, users: usersList, roleCounts };
}

export default function UsersPage() {
    const { users: usersList, roleCounts } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string | number>("admin");

    const tabs = [
        { id: "admin", label: "Admin", count: roleCounts.admin },
        { id: "partner", label: "Partner", count: roleCounts.partner },
        { id: "manager", label: "Manager", count: roleCounts.manager },
        { id: "user", label: "User", count: roleCounts.user },
    ];

    const filteredUsers = usersList?.filter(user => user.role === activeTab) || [];

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
                        <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-gray-500 text-sm font-medium flex-shrink-0">
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
