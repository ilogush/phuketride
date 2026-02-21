import { useState, useEffect, useRef } from 'react'
import { Link, Form } from 'react-router'
import { Bars3Icon, BellIcon, Cog6ToothIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import Button from '~/components/dashboard/Button'

interface TopNavigationProps {
    user: {
        name: string | null
        surname: string | null
        email: string
        role: string
    }
    onToggleSidebar?: () => void
}

export function TopNavigation({ user, onToggleSidebar }: TopNavigationProps) {
    const [showUserMenu, setShowUserMenu] = useState(false)
    const menuRef = useRef<HTMLDivElement>(null)
    const fullName = `${user.name ?? ''} ${user.surname ?? ''}`.trim() || user.email

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowUserMenu(false)
            }
        }

        if (showUserMenu) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [showUserMenu])

    return (
        <header className="bg-white border-b border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
                {/* Hamburger Menu Button */}
                <Button
                    type="button"
                    variant="unstyled"
                    onClick={onToggleSidebar}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors mr-4"
                    aria-label="Toggle sidebar"
                >
                    <Bars3Icon className="w-6 h-6" />
                </Button>

                {/* Search Bar */}
                <div className="flex-1 max-w-2xl">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full py-4 pl-10 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                        />
                        <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" />
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4 ml-6">
                    {/* Notifications */}
                    <Button type="button" variant="unstyled" className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <BellIcon className="w-6 h-6" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </Button>

                    {/* Settings */}
                    <Button type="button" variant="unstyled" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <Cog6ToothIcon className="w-6 h-6" />
                    </Button>

                    {/* User Menu */}
                    <div className="relative" ref={menuRef}>
                        <Button
                            type="button"
                            variant="unstyled"
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{fullName}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                            </div>
                            <div className="w-10 h-10 bg-gray-800 text-gray-500 rounded-full flex items-center justify-center font-semibold">
                                {fullName.charAt(0).toUpperCase()}
                            </div>
                        </Button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-50 border border-gray-200">
                                <Link
                                    to="/profile"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    Profile
                                </Link>
                                <Link
                                    to="/settings"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                    onClick={() => setShowUserMenu(false)}
                                >
                                    Settings
                                </Link>
                                <hr className="my-1 border-gray-200" />
                                <Form method="post" action="/logout">
                                    <Button
                                        type="submit"
                                        variant="unstyled"
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                                    >
                                        Logout
                                    </Button>
                                </Form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
