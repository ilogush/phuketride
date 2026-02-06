import { useState } from "react";
import { Link } from "react-router";
import {
    MagnifyingGlassIcon,
    BellIcon,
    UserCircleIcon,
} from "@heroicons/react/24/outline";

interface TopbarProps {
    user: {
        id: string;
        email: string;
        role: string;
        name: string | null;
        surname: string | null;
    };
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
}

export default function Topbar({ user, onToggleSidebar, isSidebarOpen }: TopbarProps) {
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    const displayName = user.name && user.surname
        ? `${user.name} ${user.surname}`
        : user.name || user.email;

    const roleLabel = user.role.toUpperCase();

    return (
        <header className="h-16 flex items-center px-4 sticky top-0 z-40">
            <div className="flex items-center justify-between w-full">
                {/* Menu Button + Search Bar */}
                <div className="flex items-center gap-4 flex-1 max-w-2xl">
                    {/* Menu Toggle Button */}
                    <button
                        onClick={onToggleSidebar}
                        className="w-10 h-10 flex items-center justify-center text-gray-900 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
                        title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="w-6 h-6"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.75 6.75h16.5M3.75 12H12m-8.25 5.25h16.5"
                            />
                        </svg>
                    </button>

                    {/* Search Bar */}
                    <div className="relative flex-1 group">
                        <input
                            type="text"
                            placeholder="Global search (companies, cars, users...)"
                            className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                        />
                        <div className="absolute inset-y-0 left-1 flex items-center">
                            <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center shadow-sm transition-transform group-focus-within:scale-105">
                                <MagnifyingGlassIcon className="w-4 h-4 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Notifications & Profile */}
                <div className="flex items-center gap-3 ml-6">
                    {/* Notifications */}
                    <button
                        className="relative p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-all"
                        title="Notifications"
                    >
                        <BellIcon className="w-6 h-6" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Profile */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-xl transition-all"
                        >
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <UserCircleIcon className="w-6 h-6 text-gray-600" />
                            </div>
                            <div className="text-left hidden md:block">
                                <div className="text-sm font-bold text-gray-900">
                                    {displayName}
                                </div>
                                <div className="text-xs text-gray-500 font-medium">
                                    {roleLabel}
                                </div>
                            </div>
                        </button>

                        {/* Profile Dropdown */}
                        {showProfileMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowProfileMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                                    <Link
                                        to="/dashboard/profile"
                                        className="block py-4 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setShowProfileMenu(false)}
                                    >
                                        Profile Settings
                                    </Link>
                                    <Link
                                        to="/auth/logout"
                                        className="block py-4 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                        onClick={() => setShowProfileMenu(false)}
                                    >
                                        Logout
                                    </Link>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
