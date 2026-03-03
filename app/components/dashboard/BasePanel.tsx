import type { ReactNode } from "react";

interface BasePanelProps {
    children: ReactNode;
    className?: string;
}

export default function BasePanel({ children, className = "" }: BasePanelProps) {
    return <div className={`bg-white rounded-3xl ${className}`}>{children}</div>;
}
