import { type LoaderFunctionArgs, type MetaFunction, useLoaderData, Outlet, Link, useSearchParams } from "react-router";
import { useState, useMemo } from "react";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import Card from "~/components/dashboard/Card";
import { useUrlToast } from "~/lib/useUrlToast";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { trackServerOperation } from "~/lib/telemetry.server";
import type { CalendarListBooking, CalendarListContract, CalendarListEvent } from "~/lib/calendar-page.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import CalendarTasksSidebar from "~/components/calendar/CalendarTasksSidebar";

export const meta: MetaFunction = () => [
    { title: "Calendar — Phuket Ride Admin" },
    { name: "robots", content: "noindex, nofollow" },
];

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireScopedDashboardAccess);
    const url = new URL(request.url);

    return trackServerOperation({
        event: "calendar.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: companyId!,
        details: { route: "calendar" },
        run: async () => sdb.calendar.getPageData(url),
    });
}

export default function CalendarPage() {
    const { events, contracts, bookings, currentMonth, currentYear } = useLoaderData<typeof loader>();
    useUrlToast();
    const [searchParams] = useSearchParams();
    const modCompanyId = searchParams.get("modCompanyId");
    const modModeSuffix = modCompanyId ? `&modCompanyId=${modCompanyId}` : "";

    const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDayOfWeek = getFirstDayOfMonth(currentMonth, currentYear);
    const totalCells = Math.ceil((daysInMonth + firstDayOfWeek) / 7) * 7;

    const prevMonth = () => {
        const newMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const newYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        return `/calendar?month=${newMonth}&year=${newYear}${modModeSuffix}`;
    };

    const nextMonth = () => {
        const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        return `/calendar?month=${newMonth}&year=${newYear}${modModeSuffix}`;
    };

    const dayDataMap = useMemo(() => {
        const map = new Map<number, { events: CalendarListEvent[]; contracts: CalendarListContract[]; bookings: CalendarListBooking[] }>();
        const ensureDay = (day: number) => {
            if (!map.has(day)) map.set(day, { events: [], contracts: [], bookings: [] });
            return map.get(day)!;
        };
        const getDayIfCurrentMonth = (value: string | number) => {
            const date = new Date(value);
            if (date.getFullYear() !== currentYear || date.getMonth() !== currentMonth) return null;
            return date.getDate();
        };

        events.forEach((event) => {
            const day = getDayIfCurrentMonth(event.startDate);
            if (day !== null) ensureDay(day).events.push(event);
        });
        contracts.forEach((contract) => {
            const day = getDayIfCurrentMonth(contract.endDate);
            if (day !== null) ensureDay(day).contracts.push(contract);
        });
        bookings.forEach((booking) => {
            const day = getDayIfCurrentMonth(booking.startDate);
            if (day !== null) ensureDay(day).bookings.push(booking);
        });

        return map;
    }, [events, contracts, bookings, currentMonth, currentYear]);

    const isToday = (day: number) => {
        const today = new Date();
        return day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();
    };

    const selectedDayTasks = useMemo(() => {
        const data = dayDataMap.get(selectedDay);
        if (!data) return [];
        
        const tasks: any[] = [];
        data.events.forEach(e => tasks.push({ id: e.id, title: e.title, type: 'event' }));
        data.contracts.forEach(e => tasks.push({ id: e.id, title: `Contract #${e.id} ends`, type: 'contract' }));
        data.bookings.forEach(e => tasks.push({ id: e.id, title: `Booking #${e.id} starts`, type: 'booking' }));
        return tasks;
    }, [selectedDay, dayDataMap]);

    const selectedDate = new Date(currentYear, currentMonth, selectedDay);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Calendar"
            />

            <div className="flex items-start gap-4">
                {/* Main Calendar Section */}
                <div className="flex-1 space-y-4">
                    <Card className="p-4">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <h2 className="text-xl font-bold text-gray-900">
                                    {monthNames[currentMonth]} {currentYear}
                                </h2>
                                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-2xl">
                                    <Link to={prevMonth()}>
                                        <Button variant="ghost" size="sm" icon={<ChevronLeftIcon className="w-5 h-5" />} className="rounded-xl" />
                                    </Link>
                                    <Link to={nextMonth()}>
                                        <Button variant="ghost" size="sm" icon={<ChevronRightIcon className="w-5 h-5" />} className="rounded-xl" />
                                    </Link>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-hidden border border-gray-100 rounded-2xl">
                            <div className="grid grid-cols-7 bg-gray-50/50 border-b border-gray-100">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                                    <div key={day} className="px-2 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                                        {day}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {Array.from({ length: totalCells }).map((_, i) => {
                                    const day = i - firstDayOfWeek + 1;
                                    const isValidDay = day > 0 && day <= daysInMonth;
                                    const dayData = isValidDay ? dayDataMap.get(day) : null;
                                    const dayEvents = dayData?.events || [];
                                    const totalItems = (dayData?.events.length || 0) + (dayData?.contracts.length || 0) + (dayData?.bookings.length || 0);

                                    return (
                                        <div
                                            key={i}
                                            onClick={() => isValidDay && setSelectedDay(day)}
                                            onMouseEnter={() => isValidDay && setSelectedDay(day)}
                                            className={`min-h-[100px] border-r border-b border-gray-100 p-2 relative group transition-all ${
                                                isValidDay 
                                                    ? `cursor-pointer ${selectedDay === day ? 'bg-gray-50/80 ring-2 ring-inset ring-gray-200' : 'hover:bg-gray-50/40'}` 
                                                    : 'bg-gray-50/10'
                                            }`}
                                        >
                                            {isValidDay && (
                                                <>
                                                    <div className="flex items-center justify-between">
                                                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                                                            isToday(day)
                                                                ? 'bg-gray-900 text-white'
                                                                : selectedDay === day ? 'text-gray-900 bg-gray-200' : 'text-gray-400 group-hover:text-gray-900'
                                                            }`}>
                                                            {day}
                                                        </span>
                                                        {totalItems > 0 && (
                                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                        )}
                                                    </div>
                                                    <div className="mt-2 space-y-1 overflow-hidden">
                                                        {dayEvents.slice(0, 2).map((event) => (
                                                            <div
                                                                key={event.id}
                                                                className="text-[10px] px-1.5 py-0.5 rounded-lg truncate bg-gray-800/5 text-gray-800 font-medium"
                                                            >
                                                                {event.title}
                                                            </div>
                                                        ))}
                                                        {totalItems > 2 && (
                                                            <div className="text-[10px] text-gray-400 font-bold px-1.5">
                                                                + {totalItems - 2} more
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Tasks Sidebar */}
                <CalendarTasksSidebar 
                    date={selectedDate} 
                    tasks={selectedDayTasks} 
                    modCompanyId={modCompanyId}
                />
            </div>

            <Outlet />
        </div>
    );
}
