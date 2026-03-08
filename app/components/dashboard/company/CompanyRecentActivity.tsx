import { ClockIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

interface ActivityItem {
  id: number;
  title: string;
  description: string | null;
  startDate: string;
}

interface CompanyRecentActivityProps {
  recentActivity: ActivityItem[];
}

export default function CompanyRecentActivity({ recentActivity }: CompanyRecentActivityProps) {
  return (
    <div className="p-4">
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
  );
}
