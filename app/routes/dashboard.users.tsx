import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { users } from "~/db/schema";
import PageHeader from "~/components/ui/PageHeader";
import Tabs from "~/components/ui/Tabs";
import DataTable, { type Column } from "~/components/ui/DataTable";
import StatusBadge from "~/components/ui/StatusBadge";
import Button from "~/components/ui/Button";
import { UserGroupIcon, PlusIcon } from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

    let usersList: any[] = [];
    let roleCounts = { all: 0, admin: 0, partner: 0, manager: 0, user: 0 };

    try {
        const usersQuery = db.select({
            id: users.id,
            email: users.email,
            name: users.name,
            surname: users.surname,
            role: users.role,
            phone: users.phone,
        }).from(users).limit(50);

        usersList = await usersQuery;

        roleCounts.all = usersList.length;
        roleCounts.admin = usersList.filter(u => u.role === "admin").length;
        roleCounts.partner = usersList.filter(u => u.role === "partner").length;
        roleCounts.manager = usersList.filter(u => u.role === "manager").length;
        roleCounts.user = usersList.filter(u => u.role === "user").length;
    } catch (error) {
        console.error("Error loading users:", error);
    }

    return { user, users: usersList, roleCounts };
}

export default function UsersPage() {
    const { users: usersList, roleCounts } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string>("all");

    const tabs = [
        { id: "all", label: "All", count: roleCounts.all },
        { id: "admin", label: "Admin", count: roleCounts.admin },
        { id: "partner", label: "Partner", count: roleCounts.partner },
        { id: "manager", label: "Manager", count: roleCounts.manager },
        { id: "user", label: "User", count: roleCounts.user },
    ];

    const filteredUsers = activeTab === "all"
        ? usersList
        : usersList.filter(user => user.role === activeTab);

    const columns: Column<typeof usersList[0]>[] = [
        {
            key: "id",
            label: "ID",
            render: (user) => user.id.substring(0, 8) + "..."
        },
        {
            key: "name",
            label: "Name",
            render: (user) => user.name && user.surname ? `${user.name} ${user.surname}` : user.name || "-"
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
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Users Management"
                rightActions={
                    <>
                        <Button variant="outline">Import Users</Button>
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add User
                        </Button>
                    </>
                }
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            <DataTable
                data={filteredUsers}
                columns={columns}
                totalCount={filteredUsers.length}
                emptyTitle="No users found"
                emptyDescription={activeTab === "all" ? "Start by adding your first user" : `No users with role "${activeTab}"`}
                emptyIcon={<UserGroupIcon className="w-16 h-16" />}
            />
        </div>
    );
}
