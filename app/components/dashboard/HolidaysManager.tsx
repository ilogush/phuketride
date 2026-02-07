import { useState } from "react";
import Button from "~/components/ui/Button";
import { CalendarIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface HolidaysManagerProps {
    value?: string; // JSON string array of dates
    onChange?: (value: string) => void;
}

export default function HolidaysManager({ value, onChange }: HolidaysManagerProps) {
    const [holidays, setHolidays] = useState<string[]>(() => {
        if (value) {
            try {
                return JSON.parse(value);
            } catch {
                return [];
            }
        }
        return [];
    });

    const [newDate, setNewDate] = useState("");

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    const handleAddHoliday = () => {
        if (newDate && !holidays.includes(newDate)) {
            const newHolidays = [...holidays, newDate].sort();
            setHolidays(newHolidays);
            onChange?.(JSON.stringify(newHolidays));
            setNewDate("");
        }
    };

    const handleRemoveHoliday = (date: string) => {
        const newHolidays = holidays.filter(h => h !== date);
        setHolidays(newHolidays);
        onChange?.(JSON.stringify(newHolidays));
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-gray-600" />
                <h3 className="text-sm font-bold text-gray-900">Holidays & Non-working Days</h3>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-xs text-gray-600 mb-1">Add Holiday</label>
                    <div className="flex gap-2">
                        <input
                            type="date"
                            value={newDate}
                            onChange={(e) => setNewDate(e.target.value)}
                            placeholder="Select date..."
                            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl sm:text-sm text-gray-800 focus:outline-none focus:border-gray-300"
                        />
                        <Button
                            type="button"
                            onClick={handleAddHoliday}
                            disabled={!newDate}
                            variant="primary"
                        >
                            Add
                        </Button>
                    </div>
                </div>

                {holidays.length > 0 ? (
                    <div className="space-y-2">
                        {holidays.map((date) => (
                            <div
                                key={date}
                                className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-xl"
                            >
                                <span className="text-sm text-gray-900">
                                    {new Date(date + "T00:00:00").toLocaleDateString("en-US", {
                                        weekday: "short",
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                    })}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveHoliday(date)}
                                    className="text-gray-400 hover:text-red-600"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <CalendarIcon className="w-20 h-20 mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400">No custom holidays added yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}
