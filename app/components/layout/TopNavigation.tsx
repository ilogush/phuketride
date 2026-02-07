import { useState } from 'react'
import { Link, Form } from 'react-router'

interface TopNavigationProps {
    user: {
        full_name: string
        email: string
        role: string
    }
}

export function TopNavigation({ user }: TopNavigationProps) {
    const [showUserMenu, setShowUserMenu] = useState(false)

    return (
        <header className="bg-white border-b border-gray-200 px-4 py-4">
            <div className="flex items-center justify-between">
                {/* Search Bar */}
                <div className="flex-1 max-w-2xl">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="w-full py-4 pl-10 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                        />
                        <svg
                            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                            />
                        </svg>
                    </div>
                </div>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4 ml-6">
                    {/* Notifications */}
                    <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                            />
                        </svg>
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Settings */}
                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                        </svg>
                    </button>

                    {/* User Menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                            </div>
                            <div className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center font-semibold">
                                {user.full_name.charAt(0)}
                            </div>
                        </button>

                        {showUserMenu && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-1 z-50">
                                <Link
                                    to="/profile"
                                    className="block py-4 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Profile
                                </Link>
                                <Link
                                    to="/settings"
                                    className="block py-4 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                    Settings
                                </Link>
                                <hr className="my-1 border-gray-200" />
                                <Form method="post" action="/logout">
                                    <button
                                        type="submit"
                                        className="w-full text-left py-4 text-sm text-red-600 hover:bg-gray-50"
                                    >
                                        Logout
                                    </button>
                                </Form>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    )
}
