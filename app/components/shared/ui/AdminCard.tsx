import type { ReactNode } from "react";
import { WrenchScrewdriverIcon } from "@heroicons/react/24/outline";
import BasePanel from '~/components/shared/ui/BasePanel';

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
        <BasePanel className={`p-4 ${className}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-2.5">
                    <div className="flex items-start justify-center text-gray-400 transition-colors [&_svg]:w-5 [&_svg]:h-5">
                        {icon || <WrenchScrewdriverIcon className="w-5 h-5" />}
                    </div>
                    <div>
                        <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5 ml-0.5">{title}</h3>
                        <div className="h-0.5 w-4 bg-gray-100 rounded-full ml-0.5" />
                    </div>
                </div>
                {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
            </div>
            <div className={contentClassName}>
                {children}
            </div>
        </BasePanel>
    );
}
