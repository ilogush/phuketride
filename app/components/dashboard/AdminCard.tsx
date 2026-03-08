import type { ReactNode } from "react";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import BasePanel from "~/components/dashboard/BasePanel";

interface AdminCardProps {
    title: string;
    children: ReactNode;
    icon?: ReactNode;
    headerActions?: ReactNode;
    className?: string;
    contentClassName?: string;
}

export default function AdminCard({
    title,
    children,
    icon,
    headerActions,
    className = "",
    contentClassName = "space-y-4",
}: AdminCardProps) {
    return (
        <BasePanel className={`shadow-sm p-4 ${className}`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 text-gray-600">
                        {icon || <WrenchScrewdriverIcon className="w-5 h-5" />}
                    </div>
                    <h3 className="text-sm font-bold text-gray-900">{title}</h3>
                </div>
                {headerActions && <div>{headerActions}</div>}
            </div>
            <div className={contentClassName}>
                {children}
            </div>
        </BasePanel>
    );
}
