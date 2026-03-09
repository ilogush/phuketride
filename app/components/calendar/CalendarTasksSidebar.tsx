import { Link } from "react-router";
import Button from "../shared/ui/Button";
import AdminCard from "../shared/ui/AdminCard";
import { PlusIcon, CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { Form } from "react-router";
import { Input } from "../shared/ui/Input";
import { Select } from "../shared/ui/Select";
import { Textarea } from "../shared/ui/Textarea";
import { useDateMasking } from "~/lib/useDateMasking";

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
    const [showAddForm, setShowAddForm] = useState(false);
    const { maskDateTimeInput } = useDateMasking();

    const formattedDate = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long' 
    });

    const eventTypes = [
        { id: "general", name: "General" },
        { id: "meeting", name: "Meeting" },
        { id: "delivery", name: "Delivery" },
        { id: "pickup", name: "Pickup" },
        { id: "maintenance", name: "Maintenance" },
        { id: "document_expiry", name: "Document Expiry" },
        { id: "payment_due", name: "Payment Due" },
        { id: "other", name: "Other" },
    ];

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
                        <div className="flex flex-col items-center justify-center py-12 text-center px-4 animate-in fade-in duration-300">
                            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 ring-1 ring-black/5 shadow-sm">
                                <PlusIcon className="w-6 h-6 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-400 leading-relaxed max-w-[160px]">No events or deadlines for this day</p>
                        </div>
                    ) : (
                        tasks.map((task) => (
                            <div 
                                key={`${task.type}-${task.id}`}
                                className="p-4 rounded-2xl border-none ring-1 ring-black/5 bg-white shadow-sm hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] transition-all duration-300 group relative"
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 shadow-sm ${
                                        task.type === 'contract' ? 'bg-red-500 shadow-red-500/30' : 
                                        task.type === 'booking' ? 'bg-blue-500 shadow-blue-500/30' : 'bg-gray-800 shadow-gray-800/30'
                                    }`} />
                                    <div className="min-w-0 flex-1">
                                        <h4 className="text-[13px] font-bold text-gray-900 truncate tracking-tight">
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                                                {task.type}
                                            </span>
                                            {task.time && (
                                                <span className="text-[10px] text-gray-400 font-medium">
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
                                    className="absolute inset-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-gray-900/10"
                                />
                            </div>
                        ))
                    )}
                </div>

                <div className="pt-2">
                    {showAddForm ? (
                        <div className="border-t border-gray-100 pt-4 mt-2">
                            <div className="flex items-center justify-between mb-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Event</h4>
                                <button 
                                    onClick={() => setShowAddForm(false)}
                                    className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            </div>
                            <Form method="post" action={`/calendar/new${modModeSuffix ? '?' + modModeSuffix.substring(1) : ''}`} className="space-y-3">
                                <Input
                                    label="Title"
                                    name="title"
                                    placeholder="Event title"
                                    required
                                    className="text-xs"
                                />
                                <Select
                                    label="Type"
                                    name="eventType"
                                    options={eventTypes}
                                    defaultValue="general"
                                    required
                                    className="text-xs"
                                />
                                <div className="grid grid-cols-1 gap-2">
                                    <Input
                                        label="Start Time"
                                        name="startDate"
                                        placeholder="DD/MM/YYYY HH:mm"
                                        defaultValue={`${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()} 09:00`}
                                        required
                                        onChange={maskDateTimeInput}
                                        className="text-xs"
                                    />
                                    <input type="hidden" name="color" value="#3B82F6" />
                                </div>
                                <Input
                                    label="End Time (Optional)"
                                    name="endDate"
                                    placeholder="DD/MM/YYYY HH:mm"
                                    onChange={maskDateTimeInput}
                                    className="text-xs"
                                />
                                <Textarea
                                    label="Description"
                                    name="description"
                                    rows={2}
                                    placeholder="Optional..."
                                    className="text-xs"
                                />
                                <Button 
                                    type="submit" 
                                    variant="solid" 
                                    className="w-full justify-center py-2.5 rounded-xl shadow-sm mt-2"
                                >
                                    Save Event
                                </Button>
                            </Form>
                        </div>
                    ) : (
                        <Button 
                            variant="outline" 
                            className="w-full justify-center py-3 rounded-2xl shadow-sm border border-gray-100 hover:border-gray-200"
                            icon={<PlusIcon className="w-5 h-5" />}
                            onClick={() => setShowAddForm(true)}
                        >
                            Add Event
                        </Button>
                    )}
                </div>
            </AdminCard>
        </div>
    );
}
