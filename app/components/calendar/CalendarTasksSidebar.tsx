import { Link } from "react-router";
import Button from "../dashboard/Button";
import AdminCard from "../dashboard/AdminCard";
import { PlusIcon, CalendarIcon } from "@heroicons/react/24/outline";

interface TaskItem {
    id: string | number;
    title: string;
    type: 'event' | 'contract' | 'booking';
    time?: string;
}

interface CalendarTasksSidebarProps {
    date: Date;
    tasks: TaskItem[];
    onAddTask?: () => void;
    modCompanyId?: string | null;
}

export default function CalendarTasksSidebar({ date, tasks, modCompanyId }: CalendarTasksSidebarProps) {
    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });

    const modModeSuffix = modCompanyId ? `&modCompanyId=${modCompanyId}` : "";

    return (
        <div className="w-80 shrink-0 space-y-4">
            <AdminCard 
                title={formattedDate} 
                icon={<CalendarIcon className="w-5 h-5" />}
                contentClassName="space-y-3"
            >
                <p className="text-xs text-gray-500 -mt-2 mb-2">
                    {tasks.length === 0 ? "No tasks for today" : `${tasks.length} tasks scheduled`}
                </p>

                <div className="space-y-3 min-h-[300px]">
                    {tasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                <PlusIcon className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-400">No events or deadlines for this day</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div 
                                key={`${task.type}-${task.id}`}
                                className="p-3 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all group relative bg-white"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                                        task.type === 'contract' ? 'bg-red-500' : 
                                        task.type === 'booking' ? 'bg-blue-500' : 'bg-gray-800'
                                    }`} />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-sm font-semibold text-gray-900 truncate">
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
                                                {task.type}
                                            </span>
                                            {task.time && (
                                                <span className="text-[10px] text-gray-400">
                                                    • {task.time}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <Link 
                                    to={task.type === 'contract' ? `/contracts/${task.id}/edit` : 
                                        task.type === 'booking' ? `/bookings/${task.id}` : 
                                        `/calendar/edit/${task.id}${modModeSuffix ? '?' + modModeSuffix.substring(1) : ''}`}
                                    className="absolute inset-0 rounded-2xl"
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-2">
                    <Link to={`/calendar/new?date=${date.toISOString().split('T')[0]}${modModeSuffix}`} className="block">
                        <Button 
                            variant="solid" 
                            className="w-full justify-center py-3 rounded-2xl shadow-sm"
                            icon={<PlusIcon className="w-5 h-5" />}
                        >
                            Add Task
                        </Button>
                    </Link>
                </div>
            </AdminCard>
        </div>
    );
}
