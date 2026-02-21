import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Outlet, Link, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { drizzle } from "drizzle-orm/d1";
import { and, gte, lte, eq } from "drizzle-orm";
import { requireAuth } from "~/lib/auth.server";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import Card from "~/components/dashboard/Card";
import { useToast } from "~/lib/toast";
import { PlusIcon, ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
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

    // Get first and last day of month
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Get events for current month
    const events = await db.query.calendarEvents.findMany({
        where: (events, { and, gte, lte, eq }) => and(
            eq(events.companyId, effectiveCompanyId),
            gte(events.startDate, firstDay),
            lte(events.startDate, lastDay)
        ),
        orderBy: (events, { asc }) => [asc(events.startDate)],
        limit: 100,
    });

    // Get contracts ending this month
    const contractsRaw = await db.query.contracts.findMany({
        where: (contracts, { and, gte, lte, eq, inArray }) => and(
            gte(contracts.endDate, firstDay),
            lte(contracts.endDate, lastDay),
            inArray(contracts.status, ["active"])
        ),
        with: {
            companyCar: {
                with: {
                    template: {
                        with: {
                            brand: true,
                            model: true,
                        }
                    }
                }
            },
            client: true,
        },
        limit: 50,
    });
    const contracts = contractsRaw.filter(contract => contract.companyCar.companyId === effectiveCompanyId);

    // Get bookings this month
    const bookingsRaw = await db.query.bookings.findMany({
        where: (bookings, { and, gte, lte, inArray }) => and(
            gte(bookings.startDate, firstDay),
            lte(bookings.startDate, lastDay),
            inArray(bookings.status, ["pending", "confirmed"])
        ),
        with: {
            companyCar: {
                with: {
                    template: {
                        with: {
                            brand: true,
                            model: true,
                        }
                    }
                }
            },
        },
        limit: 50,
    });
    const bookings = bookingsRaw.filter(booking => booking.companyCar.companyId === effectiveCompanyId);

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
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const modCompanyId = searchParams.get("modCompanyId");
    const modModeSuffix = modCompanyId ? `&modCompanyId=${modCompanyId}` : "";

    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success) toast.success(success);
        if (error) toast.error(error);
    }, [searchParams, toast]);

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
        return `/dashboard/calendar?month=${newMonth}&year=${newYear}${modModeSuffix}`;
    };

    const nextMonth = () => {
        const newMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const newYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        return `/dashboard/calendar?month=${newMonth}&year=${newYear}${modModeSuffix}`;
    };

    const getEventsForDay = (day: number) => {
        const dayDate = new Date(currentYear, currentMonth, day);
        const dayStart = new Date(dayDate.setHours(0, 0, 0, 0));
        const dayEnd = new Date(dayDate.setHours(23, 59, 59, 999));

        const dayEvents = events.filter(event => {
            const eventDate = new Date(event.startDate);
            return eventDate >= dayStart && eventDate <= dayEnd;
        });

        const dayContracts = contracts.filter(contract => {
            const endDate = new Date(contract.endDate);
            return endDate >= dayStart && endDate <= dayEnd;
        });

        const dayBookings = bookings.filter(booking => {
            const startDate = new Date(booking.startDate);
            return startDate >= dayStart && startDate <= dayEnd;
        });

        return { events: dayEvents, contracts: dayContracts, bookings: dayBookings };
    };

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
                    <Link to={modCompanyId ? `/dashboard/calendar/new?modCompanyId=${modCompanyId}` : "/dashboard/calendar/new"}>
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />}>
                            Add Event
                        </Button>
                    </Link>
                }
            />

            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                    <Link to={prevMonth()}>
                        <Button variant="secondary" icon={<ChevronLeftIcon className="w-5 h-5" />} />
                    </Link>
                    <h2 className="text-xl font-bold text-gray-900">
                        {monthNames[currentMonth]} {currentYear}
                    </h2>
                    <Link to={nextMonth()}>
                        <Button variant="secondary" icon={<ChevronRightIcon className="w-5 h-5" />} />
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
                        const { events: dayEvents, contracts: dayContracts, bookings: dayBookings } = isValidDay ? getEventsForDay(day) : { events: [], contracts: [], bookings: [] };

                        return (
                            <div 
                                key={i} 
                                className={`min-h-[100px] sm:min-h-[120px] border-r border-b border-gray-100 p-1 sm:p-2 ${
                                    isValidDay ? 'hover:bg-gray-50/20 transition-colors group cursor-pointer' : 'bg-gray-50/30'
                                }`}
                            >
                                {isValidDay && (
                                    <>
                                        <span className={`text-xs font-bold ${
                                            isToday(day) 
                                                ? 'bg-gray-800 text-white rounded-full px-2 py-1' 
                                                : 'text-gray-400 group-hover:text-gray-900'
                                        } transition-colors`}>
                                            {day}
                                        </span>
                                        <div className="mt-1 space-y-1">
                                            {dayEvents.map(event => {
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
                                            {dayContracts.map(contract => (
                                                <div 
                                                    key={contract.id} 
                                                    className="text-[10px] sm:text-xs px-1 py-0.5 rounded truncate bg-red-50 text-red-600"
                                                    title={`Contract #${contract.id} ends`}
                                                >
                                                    End: #{contract.id}
                                                </div>
                                            ))}
                                            {dayBookings.map(booking => (
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
