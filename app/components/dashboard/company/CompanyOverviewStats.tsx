import {
  TruckIcon,
  CalendarIcon,
  UserGroupIcon,
  BanknotesIcon,
} from "@heroicons/react/24/outline";

interface CompanyOverviewStatsProps {
  stats: {
    totalVehicles: number;
    inWorkshop: number;
    activeBookings: number;
    upcomingBookings: number;
    totalRevenue: number;
    thisMonthRevenue: number;
    totalCustomers: number;
  };
}

export default function CompanyOverviewStats({ stats }: CompanyOverviewStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
  );
}
