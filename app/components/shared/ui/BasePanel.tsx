import type { ReactNode } from "react";

interface BasePanelProps {
    children: ReactNode;
    className?: string;
}

export default function BasePanel({ children, className = "" }: BasePanelProps) {
    return (
        <div className={`bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-black/5 ${className}`}>
            {children}
        </div>
    );
}
