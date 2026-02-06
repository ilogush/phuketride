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
                <div className="flex items-center gap-4 flex-1 max-w-md">
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
                            className="w-full pl-4 pr-14 py-2.5 bg-white border border-gray-200 rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-200 transition-all"
                        />
                        <div className="absolute inset-y-2 right-1.5 flex items-center">
                            <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center shadow-sm transition-transform group-focus-within:scale-105">
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
                            className="flex items-center gap-3 p-1.5 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 rounded-xl transition-all"
                        >
                            <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white text-xs font-bold">
                                    {displayName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="text-left hidden md:block pr-2">
                                <div className="text-sm font-bold text-gray-900 leading-none mb-1">
                                    {displayName}
                                </div>
                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider leading-none">
                                    {roleLabel}
                                </div>
                            </div>
                            <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {/* Profile Dropdown */}
                        {showProfileMenu && (
                            <>
                                <div
                                    className="fixed inset-0 z-40"
                                    onClick={() => setShowProfileMenu(false)}
                                />
                                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                                    <Link
                                        to="/dashboard/profile"
                                        className="flex items-center gap-4 px-4 py-4 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        onClick={() => setShowProfileMenu(false)}
                                    >
                                        <UserCircleIcon className="w-6 h-6 text-gray-500" />
                                        <span>Profile Settings</span>
                                    </Link>

                                    <Link
                                        to="/logout"
                                        className="flex items-center gap-4 px-4 py-4 text-sm font-medium text-red-600 hover:bg-gray-50 border-t border-gray-50 transition-colors"
                                        onClick={() => setShowProfileMenu(false)}
                                    >
                                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 11-6 0v-1m6-10V7a3 3 0 00-6 0v1" />
                                        </svg>
                                        <span>Logout</span>
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
