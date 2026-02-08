import { useState } from "react";
import { NavLink, useLocation } from "react-router";
import {
    Squares2X2Icon,
    TruckIcon,
    DocumentTextIcon,
    BanknotesIcon,
    UsersIcon,
    BuildingOfficeIcon,
    Cog6ToothIcon,
    MapPinIcon,
    BuildingOffice2Icon,
    ClockIcon,
    SwatchIcon,
    ClipboardDocumentListIcon,
    SunIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon,
    UserIcon,
    XMarkIcon,
    RectangleStackIcon,
} from "@heroicons/react/24/outline";
import type { UserRole } from "~/lib/auth.server";

interface SidebarProps {
    user: {
        id: string;
        email: string;
        role: UserRole;
        name: string | null;
        surname: string | null;
    };
    isOpen: boolean;
    onClose?: () => void;
}

const getMenuItems = (role: UserRole) => {
    const baseItems: Array<{
        to: string;
        icon: typeof Squares2X2Icon;
        label: string;
        end?: boolean;
    }> = [
            { to: "/dashboard", icon: Squares2X2Icon, label: "Dashboard", end: true },
        ];

    if (role === "admin") {
        return [
            ...baseItems,
            { to: "/companies", icon: BuildingOfficeIcon, label: "Companies" },
            { to: "/users", icon: UsersIcon, label: "Users" },
            { to: "/cars", icon: TruckIcon, label: "Cars" },
            { to: "/car-templates", icon: RectangleStackIcon, label: "Car Management" },
            { to: "/payments", icon: BanknotesIcon, label: "Payments" },
            { to: "/locations", icon: MapPinIcon, label: "Locations" },
            { to: "/hotels", icon: BuildingOffice2Icon, label: "Hotels" },
            { to: "/durations", icon: ClockIcon, label: "Durations" },
            { to: "/seasons", icon: SunIcon, label: "Seasons" },
            { to: "/colors", icon: SwatchIcon, label: "Colors" },
            { to: "/admin/audit-logs", icon: ClipboardDocumentListIcon, label: "Audit Logs" },
        ];
    }

    if (role === "partner") {
        return [
            ...baseItems,
            { to: "/contracts", icon: DocumentTextIcon, label: "Contracts" },
            { to: "/locations", icon: MapPinIcon, label: "Delivery" },
            { to: "/cars", icon: TruckIcon, label: "Cars" },
            { to: "/durations", icon: ClockIcon, label: "Durations" },
            { to: "/payments", icon: BanknotesIcon, label: "Payments" },
            { to: "/users", icon: UsersIcon, label: "Users" },
            { to: "/calendar", icon: CalendarIcon, label: "Calendar" },
            { to: "/chat", icon: ChatBubbleLeftRightIcon, label: "Chat" },
            { to: "/settings", icon: Cog6ToothIcon, label: "Settings" },
        ];
    }

    if (role === "manager") {
        return [
            ...baseItems,
            { to: "/bookings", icon: DocumentTextIcon, label: "Bookings" },
            { to: "/cars", icon: TruckIcon, label: "Cars" },
            { to: "/contracts", icon: DocumentTextIcon, label: "Contracts" },
            { to: "/durations", icon: ClockIcon, label: "Durations" },
            { to: "/payments", icon: BanknotesIcon, label: "Payments" },
            { to: "/users", icon: UsersIcon, label: "Users" },
            { to: "/calendar", icon: CalendarIcon, label: "Calendar" },
            { to: "/chat", icon: ChatBubbleLeftRightIcon, label: "Chat" },
            { to: "/profile", icon: UserIcon, label: "Profile" },
        ];
    }

    // User role
    return [
        ...baseItems,
        { to: "/search-cars", icon: TruckIcon, label: "Search Cars" },
        { to: "/my-bookings", icon: DocumentTextIcon, label: "My Bookings" },
        { to: "/my-contracts", icon: DocumentTextIcon, label: "My Contracts" },
        { to: "/profile", icon: UserIcon, label: "Profile" },
    ];
};

export default function Sidebar({ user, isOpen, onClose }: SidebarProps) {
    const location = useLocation();
    const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number } | null>(null);
    const menuItems = getMenuItems(user.role);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside
                className={`fixed md:static inset-y-0 left-0 bg-white h-screen flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out z-50 print:hidden ${isOpen
                    ? "w-[240px] border-r border-gray-200 translate-x-0"
                    : "w-0 border-none md:w-[72px] md:border-r md:border-gray-200 overflow-hidden -translate-x-full md:translate-x-0"
                    }`}
            >
                {/* Logo Area */}
                <div
                    className={`h-16 flex items-center flex-shrink-0 transition-all ${isOpen ? "px-4 justify-between" : "justify-center"
                        }`}
                >
                    <NavLink to="/" className="flex items-center group">
                        <img
                            src="/android-chrome-192x192.png"
                            alt="Phuket Ride"
                            className={`transition-all rounded-xl ${isOpen ? "h-10 w-10" : "h-8 w-8"}`}
                        />
                        {isOpen && (
                            <span className="ml-3 font-black text-xl tracking-tight text-black group-hover:scale-105 transition-transform hidden md:block">
                                Phuket Ride
                            </span>
                        )}
                    </NavLink>

                    {/* Close Button - Mobile Only */}
                    {isOpen && (
                        <button
                            onClick={onClose}
                            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                            aria-label="Close menu"
                        >
                            <XMarkIcon className="w-6 h-6 text-gray-600" />
                        </button>
                    )}
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => {
                        const Icon = item.icon;

                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                onClick={() => {
                                    // Close sidebar on mobile when clicking a link
                                    if (window.innerWidth < 768 && onClose) {
                                        onClose();
                                    }
                                }}
                                className={({ isActive }) => `
                                    flex items-center gap-3 rounded-xl transition-all duration-300 group relative
                                    ${isOpen ? "p-2.5 w-full" : "w-10 h-10 justify-center p-0 mx-auto"}
                                    ${isActive
                                        ? "bg-gray-200 text-gray-900 shadow-sm"
                                        : "text-gray-400 hover:bg-gray-50 hover:text-gray-900"
                                    }
                                `}
                                onMouseEnter={(e) => {
                                    if (!isOpen) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        setHoveredItem({ label: item.label, top: rect.top });
                                    }
                                }}
                                onMouseLeave={() => setHoveredItem(null)}
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon
                                            className={`
                                                flex-shrink-0 transition-transform duration-300
                                                ${isActive
                                                    ? "text-green-600"
                                                    : "text-gray-400 group-hover:text-gray-600"
                                                }
                                                w-[22px] h-[22px] stroke-[2px]
                                            `}
                                        />

                                        {isOpen && (
                                            <span className="font-medium text-[15px] truncate">{item.label}</span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
            </aside>

            {/* Tooltip for Collapsed Sidebar */}
            {!isOpen && hoveredItem && (
                <div
                    className="fixed z-50 bg-gray-800 text-gray-500 text-xs font-medium px-3 py-1.5 rounded-lg shadow-xl border border-gray-700 pointer-events-none whitespace-nowrap left-[80px]"
                    style={{ top: hoveredItem.top + 6 }}
                >
                    {hoveredItem.label}
                    <div className="absolute top-1/2 -left-1.5 -mt-1.5 border-[6px] border-transparent border-r-gray-800"></div>
                </div>
            )}
        </>
    );
}
