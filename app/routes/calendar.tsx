import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Outlet, Link, useSearchParams } from "react-router";
import { useMemo } from "react";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import Card from "~/components/dashboard/Card";
import { useUrlToast } from "~/lib/useUrlToast";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { getMonthWindow, toIsoWindow } from "~/lib/date-windows";

type CalendarEvent = { id: number; title: string; startDate: string; color?: string | null };
type CalendarContract = { id: number; endDate: string };
type CalendarBooking = { id: number; startDate: string };

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);

    if (!effectiveCompanyId) {
        throw new Response("Company not found", { status: 404 });
    }

    const url = new URL(request.url);
    const monthParam = url.searchParams.get("month");
    const yearParam = url.searchParams.get("year");

    const now = new Date();
    const currentMonth = monthParam ? parseInt(monthParam) : now.getMonth();
    const currentYear = yearParam ? parseInt(yearParam) : now.getFullYear();

    const { start, end } = getMonthWindow(currentYear, currentMonth);
    const { startIso, endIso } = toIsoWindow({ start, end });

    const [eventsResult, contractsResult, bookingsResult] = await Promise.all([
        context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id,
                    title,
                    start_date AS startDate,
                    color
                FROM calendar_events
                WHERE company_id = ? AND start_date >= ? AND start_date <= ?
                ORDER BY start_date ASC
                LIMIT ${QUERY_LIMITS.LARGE}
            `)
            .bind(effectiveCompanyId, startIso, endIso)
            .all(),
        context.cloudflare.env.DB
            .prepare(`
                SELECT
                    c.id,
                    c.end_date AS endDate
                FROM contracts c
                JOIN company_cars cc ON cc.id = c.company_car_id
                WHERE cc.company_id = ? AND c.status = 'active' AND c.end_date >= ? AND c.end_date <= ?
                LIMIT ${QUERY_LIMITS.MEDIUM}
            `)
            .bind(effectiveCompanyId, startIso, endIso)
            .all(),
        context.cloudflare.env.DB
            .prepare(`
                SELECT
                    b.id,
                    b.start_date AS startDate
                FROM bookings b
                JOIN company_cars cc ON cc.id = b.company_car_id
                WHERE cc.company_id = ? AND b.status IN ('pending', 'confirmed') AND b.start_date >= ? AND b.start_date <= ?
                LIMIT ${QUERY_LIMITS.MEDIUM}
            `)
            .bind(effectiveCompanyId, startIso, endIso)
            .all(),
    ]);
    const events = ((eventsResult as { results?: unknown[] }).results || []) as CalendarEvent[];
    const contracts = ((contractsResult as { results?: unknown[] }).results || []) as CalendarContract[];
    const bookings = ((bookingsResult as { results?: unknown[] }).results || []) as CalendarBooking[];

    return {
        user,
        events,
        contracts,
        bookings,
        currentMonth,
        currentYear
    };
}

export default function CalendarPage() {
    const { user, events, contracts, bookings, currentMonth, currentYear } = useLoaderData<typeof loader>();
    useUrlToast();
    const [searchParams] = useSearchParams();
    const modCompanyId = searchParams.get("modCompanyId");
    const modModeSuffix = modCompanyId ? `&modCompanyId=${modCompanyId}` : "";

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
        const map = new Map<number, { events: CalendarEvent[]; contracts: CalendarContract[]; bookings: CalendarBooking[] }>();
        const ensureDay = (day: number) => {
            if (!map.has(day)) map.set(day, { events: [], contracts: [], bookings: [] });
            return map.get(day)!;
        };
        const getDayIfCurrentMonth = (value: string) => {
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

    return (
        <div className="space-y-4">
            <PageHeader
                title="Calendar"
                rightActions={
                    <Link to={modCompanyId ? `/calendar/new?modCompanyId=${modCompanyId}` : "/calendar/new"}>
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add Event
                        </Button>
                    </Link>
                }
            />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Link to={prevMonth()}>
                        <Button variant="ghost" icon={<ChevronLeftIcon className="w-5 h-5" />} />
                    </Link>
                    <h2 className="text-xl font-bold text-gray-900">
                        {monthNames[currentMonth]} {currentYear}
                    </h2>
                    <Link to={nextMonth()}>
                        <Button variant="ghost" icon={<ChevronRightIcon className="w-5 h-5" />} />
                    </Link>
                </div>
            </div>

            <Card className="p-0 overflow-hidden border-gray-200">
                <div className="grid grid-cols-7 border-b border-gray-100">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                        <div key={day} className="px-2 sm:px-4 py-3 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/50">
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
                        const dayContracts = dayData?.contracts || [];
                        const dayBookings = dayData?.bookings || [];

                        return (
                            <div
                                key={i}
                                className={`min-h-[100px] sm:min-h-[120px] border-r border-b border-gray-100 p-1 sm:p-2 ${isValidDay ? 'hover:bg-gray-50/20 transition-colors group cursor-pointer' : 'bg-gray-50/30'
                                    }`}
                            >
                                {isValidDay && (
                                    <>
                                        <span className={`text-xs font-bold ${isToday(day)
                                            ? 'bg-gray-800 text-white rounded-full px-2 py-1'
                                            : 'text-gray-400 group-hover:text-gray-900'
                                            } transition-colors`}>
                                            {day}
                                        </span>
                                        <div className="mt-1 space-y-1">
                                            {dayEvents.map((event) => {
                                                const color = event.color ?? '#6B7280'
                                                return (
                                                    <div
                                                        key={event.id}
                                                        className="text-[10px] sm:text-xs px-1 py-0.5 rounded truncate"
                                                        style={{ backgroundColor: `${color}20`, color }}
                                                        title={event.title}
                                                    >
                                                        {event.title}
                                                    </div>
                                                )
                                            })}
                                            {dayContracts.map((contract) => (
                                                <div
                                                    key={contract.id}
                                                    className="text-[10px] sm:text-xs px-1 py-0.5 rounded truncate bg-red-50 text-red-600"
                                                    title={`Contract #${contract.id} ends`}
                                                >
                                                    End: #{contract.id}
                                                </div>
                                            ))}
                                            {dayBookings.map((booking) => (
                                                <div
                                                    key={booking.id}
                                                    className="text-[10px] sm:text-xs px-1 py-0.5 rounded truncate bg-blue-50 text-blue-600"
                                                    title={`Booking #${booking.id} starts`}
                                                >
                                                    Book: #{booking.id}
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Outlet />
        </div>
    );
}
