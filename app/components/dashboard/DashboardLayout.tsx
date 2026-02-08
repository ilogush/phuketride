import { useState, type ReactNode } from 'react';
import Sidebar from './Sidebar';
import { TopNavigation } from './TopNavigation';

interface LayoutProps {
    children: ReactNode;
    user: {
        id: string;
        full_name: string;
        email: string;
        role: 'admin' | 'partner' | 'manager' | 'user';
        company_id?: string;
    };
}

export function Layout({ children, user }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <Sidebar 
                user={user} 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Navigation */}
                <TopNavigation 
                    user={user} 
                    onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
                />

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
