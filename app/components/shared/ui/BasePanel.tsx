import type { ReactNode } from "react";

interface BasePanelProps {
    children: ReactNode;
    className?: string;
}

export default function BasePanel({ children, className = "" }: BasePanelProps) {
    return (
        <div className={`bg-white rounded-3xl ring-1 ring-black/5 ${className}`}>
            {children}
        </div>
    );
}
