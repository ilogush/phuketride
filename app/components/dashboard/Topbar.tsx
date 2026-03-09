import { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import {
    ArrowRightOnRectangleIcon,
    Bars3Icon,
    ChevronDownIcon,
    BellIcon,
    UserCircleIcon,
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import Avatar from '~/components/shared/ui/Avatar';

interface TopbarProps {
    user: {
        id: string;
        email: string;
        role: string;
        name: string | null;
        surname: string | null;
        avatarUrl?: string | null;
    };
    onToggleSidebar: () => void;
    isSidebarOpen: boolean;
    notificationsCount?: number;
}

export default function Topbar({ user, onToggleSidebar, isSidebarOpen, notificationsCount = 0 }: TopbarProps) {
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const menuRef = useRef<HTMLDivElement>(null);
    const [searchValue, setSearchValue] = useState(() => searchParams.get("search") || "");

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
        }

        if (showProfileMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showProfileMenu]);

    useEffect(() => {
        setSearchValue(searchParams.get("search") || "");
    }, [searchParams]);

    const submitSearch = (rawValue: string) => {
        const next = new URLSearchParams(searchParams);
        const value = rawValue.trim();
        if (value) {
            next.set("search", value);
        } else {
            next.delete("search");
        }
        next.set("page", "1");
        const query = next.toString();
        navigate(`${location.pathname}${query ? `?${query}` : ""}`);
    };

    const displayName = user.name && user.surname
        ? `${user.name} ${user.surname}`
        : user.name || user.email;

    const roleLabel = user.role.toUpperCase();

    return (
        <header className="h-16 flex items-center px-4">
            <div className="flex items-center justify-between w-full">
                {/* Menu Button + Search Bar */}
                <div className="flex items-center gap-4 flex-1 max-w-md">
                    <button
                        onClick={onToggleSidebar}
                        className="w-10 h-10 flex items-center justify-center text-gray-900 hover:bg-gray-100 rounded-xl transition-all flex-shrink-0"
                        title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                    >
                        <Bars3Icon className="w-6 h-6" />
                    </button>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            submitSearch(searchValue);
                        }}
                        className="relative flex-1 group hidden md:block"
                    >
                        <label className="block">
                            <input
                                type="text"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="Global search (companies, cars, users...)"
                                className="w-full pl-4 pr-14 py-2.5 bg-white rounded-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-gray-200 transition-all border border-gray-200"
                            />
                        </label>
                        <div className="absolute inset-y-2 right-1.5 flex items-center">
                            <button
                                type="submit"
                                className="w-8 h-8 text-white rounded-full bg-gray-800 flex items-center justify-center shadow-sm transition-transform group-focus-within:scale-105"
                                aria-label="Search"
                            >
                                <MagnifyingGlassIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Side - Notifications & Profile */}
                <div className="flex items-center gap-2 sm:gap-4 ml-4 sm:ml-6 flex-shrink-0">
                    {/* Notifications */}
                    <Link
                        to="/notifications"
                        className="relative p-2.5 text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm ring-1 ring-transparent hover:ring-black/5 rounded-[1.25rem] transition-all"
                        title="Notifications"
                    >
                        <BellIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                        {notificationsCount > 0 && (
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-gray-100"></span>
                        )}
                    </Link>

                    {/* Profile */}
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setShowProfileMenu(!showProfileMenu)}
                            className="flex items-center gap-3 p-1.5 pr-3 hover:bg-white hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-transparent hover:ring-black/5 rounded-[2rem] transition-all"
                        >
                            <Avatar 
                                src={user.avatarUrl} 
                                initials={displayName.charAt(0).toUpperCase()} 
                                size="sm" 
                                className="border border-gray-100 shadow-sm"
                            />
                            <div className="text-left hidden md:block pr-1">
                                <div className="text-[13px] font-bold text-gray-900 leading-none mb-1.5">
                                    {displayName}
                                </div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
                                    {roleLabel}
                                </div>
                            </div>
                            <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 hidden md:block ${showProfileMenu ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Profile Dropdown */}
                        {showProfileMenu && (
                            <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] ring-1 ring-black/5 py-2 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-5 py-3 border-b border-gray-50 mb-1 md:hidden">
                                    <div className="text-sm font-bold text-gray-900 truncate">
                                        {displayName}
                                    </div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">
                                        {roleLabel}
                                    </div>
                                </div>
                                <Link
                                    to="/profile"
                                    className="flex items-center gap-3 px-5 py-3.5 text-[13px] font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors mx-2 rounded-2xl"
                                    onClick={() => setShowProfileMenu(false)}
                                >
                                    <UserCircleIcon className="w-5 h-5 text-gray-400" />
                                    <span>Profile Settings</span>
                                </Link>

                                <div className="h-px bg-gray-50 my-1 mx-4" />

                                <Link
                                    to="/logout"
                                    className="flex items-center gap-3 px-5 py-3.5 text-[13px] font-bold text-red-600 hover:bg-red-50 transition-colors mx-2 rounded-2xl w-auto"
                                    onClick={() => setShowProfileMenu(false)}
                                >
                                    <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-500" />
                                    <span>Logout</span>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
}
