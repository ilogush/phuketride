import { useState } from "react";
import { Link } from "react-router";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

import Avatar from "~/components/dashboard/Avatar";
import Button from "~/components/dashboard/Button";
import DataTable from "~/components/dashboard/DataTable";
import Sidebar from "~/components/dashboard/Sidebar";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Tabs from "~/components/dashboard/Tabs";
import Topbar from "~/components/dashboard/Topbar";
import CompanyOverviewStats from "~/components/dashboard/company/CompanyOverviewStats";
import CompanyRecentActivity from "~/components/dashboard/company/CompanyRecentActivity";

import type { SessionUser } from "~/lib/auth.server";
import { formatContactPhone } from "~/lib/phone";
import type {
  CompanyTeamMember,
  CompanyVehicle,
} from "~/features/company-detail/company-detail.loader.server";

type CompanyDetailPageViewProps = {
  user: SessionUser;
  company: {
    id: number;
    name: string;
    email: string | null;
  } | null;
  stats: {
    totalVehicles: number;
    inWorkshop: number;
    activeBookings: number;
    upcomingBookings: number;
    totalRevenue: number;
    thisMonthRevenue: number;
    totalCustomers: number;
  };
  vehicles: CompanyVehicle[];
  teamMembers: CompanyTeamMember[];
  recentActivity: Array<{
    id: number;
    title: string;
    description: string | null;
    startDate: string;
    status: string;
  }>;
};

export default function CompanyDetailPageView({
  user,
  company,
  stats,
  vehicles,
  teamMembers,
  recentActivity,
}: CompanyDetailPageViewProps) {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const isAdminModMode = user.role === "admin" && company?.id;

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-100 flex">
        <Sidebar
          user={user}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />
        <div className="flex-1 overflow-y-auto">
          <Topbar
            user={user}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            isSidebarOpen={isSidebarOpen}
          />
          <main className="p-4">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Company Not Found
              </h1>
              <p className="text-gray-500">
                The company you are looking for does not exist.
              </p>
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

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "vehicles", label: `Vehicles (${vehicles.length})` },
    { id: "team", label: `Team (${teamMembers.length})` },
  ];

  const vehicleColumns = [
    {
      key: "id",
      label: "ID",
      render: (vehicle: CompanyVehicle) => (
        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
          {String(vehicle.id).padStart(3, "0")}
        </span>
      ),
    },
    {
      key: "make",
      label: "Make",
      render: (vehicle: CompanyVehicle) => (
        <div className="flex items-center gap-2">
          <span>{vehicle.brandName || "-"}</span>
          <span className="text-gray-400">{vehicle.modelName || ""}</span>
        </div>
      ),
    },
    {
      key: "licensePlate",
      label: "License Plate",
      render: (vehicle: CompanyVehicle) => (
        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
          {vehicle.licensePlate}
        </span>
      ),
    },
    { key: "year", label: "Year" },
    {
      key: "pricePerDay",
      label: "Price",
      render: (vehicle: CompanyVehicle) =>
        `฿${(vehicle.pricePerDay || 0).toLocaleString()}`,
    },
    {
      key: "status",
      label: "Status",
      render: (vehicle: CompanyVehicle) => {
        const status = vehicle.status || "available";
        const variant =
          status === "available"
            ? "success"
            : status === "rented"
              ? "warning"
              : status === "maintenance"
                ? "error"
                : "neutral";
        return <StatusBadge variant={variant}>{status}</StatusBadge>;
      },
    },
  ];

  const teamColumns = [
    {
      key: "member",
      label: "Member",
      render: (member: CompanyTeamMember) => (
        <div className="flex items-center gap-3">
          <Avatar
            src={member.avatarUrl}
            initials={`${member.name?.[0] || ""}${member.surname?.[0] || ""}`}
            size="sm"
          />
          <div>
            <p className="font-medium text-gray-900">
              {member.name} {member.surname}
            </p>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (member: CompanyTeamMember) => formatContactPhone(member.phone),
    },
    {
      key: "role",
      label: "Role",
      render: (member: CompanyTeamMember) => (
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
        <Topbar
          user={user}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          isSidebarOpen={isSidebarOpen}
        />
        <main className="p-4">
          <div className="space-y-6">
            <Link
              to="/companies"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Companies</span>
            </Link>

            <div className="p-6">
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

              <div className="mt-6 border-b border-gray-200">
                <Tabs
                  tabs={tabs}
                  activeTab={activeTab}
                  onTabChange={(id) => setActiveTab(id as string)}
                />
              </div>
            </div>

            {activeTab === "overview" && (
              <div className="space-y-6">
                <CompanyOverviewStats stats={stats} />
                <CompanyRecentActivity recentActivity={recentActivity} />
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
