import { useState } from "react";
import Toggle from "~/components/ui/Toggle";
import { ClockIcon } from "@heroicons/react/24/outline";

interface DaySchedule {
    open: boolean;
    startTime: string;
    endTime: string;
}

interface WeeklyScheduleData {
    sunday: DaySchedule;
    monday: DaySchedule;
    tuesday: DaySchedule;
    wednesday: DaySchedule;
    thursday: DaySchedule;
    friday: DaySchedule;
    saturday: DaySchedule;
}

interface WeeklyScheduleProps {
    value?: string; // JSON string
    onChange?: (value: string) => void;
}

const defaultSchedule: WeeklyScheduleData = {
    sunday: { open: false, startTime: "08:00", endTime: "20:00" },
    monday: { open: true, startTime: "08:00", endTime: "20:00" },
    tuesday: { open: true, startTime: "08:00", endTime: "20:00" },
    wednesday: { open: true, startTime: "08:00", endTime: "20:00" },
    thursday: { open: true, startTime: "08:00", endTime: "20:00" },
    friday: { open: true, startTime: "08:00", endTime: "20:00" },
    saturday: { open: true, startTime: "08:00", endTime: "20:00" },
};

const days = [
    { key: "sunday", label: "Sunday" },
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
];

export default function WeeklySchedule({ value, onChange }: WeeklyScheduleProps) {
    const [schedule, setSchedule] = useState<WeeklyScheduleData>(() => {
        if (value) {
            try {
                return JSON.parse(value);
            } catch {
                return defaultSchedule;
            }
        }
        return defaultSchedule;
    });

    const handleToggle = (day: keyof WeeklyScheduleData) => {
        const newSchedule = {
            ...schedule,
            [day]: { ...schedule[day], open: !schedule[day].open },
        };
        setSchedule(newSchedule);
        onChange?.(JSON.stringify(newSchedule));
    };

    const handleTimeChange = (day: keyof WeeklyScheduleData, field: "startTime" | "endTime", value: string) => {
        const newSchedule = {
            ...schedule,
            [day]: { ...schedule[day], [field]: value },
        };
        setSchedule(newSchedule);
        onChange?.(JSON.stringify(newSchedule));
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
                <ClockIcon className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-900">Weekly Schedule</h3>
            </div>

            <div className="space-y-3">
                <div className="grid grid-cols-4 gap-4 text-xs font-bold text-gray-600 pb-2 border-b border-gray-100">
                    <div>day</div>
                    <div>status</div>
                    <div>start time</div>
                    <div>end time</div>
                </div>

                {days.map(({ key, label }) => {
                    const daySchedule = schedule[key as keyof WeeklyScheduleData];
                    return (
                        <div key={key} className="grid grid-cols-4 gap-4 items-center">
                            <div className="text-sm font-medium text-gray-900">{label}</div>
                            <div className="flex items-center gap-2">
                                <Toggle
                                    enabled={daySchedule.open}
                                    onChange={() => handleToggle(key as keyof WeeklyScheduleData)}
                                />
                                <span className={`text-xs font-bold ${daySchedule.open ? "text-green-600" : "text-gray-400"}`}>
                                    {daySchedule.open ? "OPEN" : "CLOSED"}
                                </span>
                            </div>
                            <div>
                                {daySchedule.open ? (
                                    <input
                                        type="time"
                                        value={daySchedule.startTime}
                                        onChange={(e) => handleTimeChange(key as keyof WeeklyScheduleData, "startTime", e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                )}
                            </div>
                            <div>
                                {daySchedule.open ? (
                                    <input
                                        type="time"
                                        value={daySchedule.endTime}
                                        onChange={(e) => handleTimeChange(key as keyof WeeklyScheduleData, "endTime", e.target.value)}
                                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
