interface FormBoxProps {
    children: React.ReactNode;
    className?: string;
}

export default function FormBox({ children, className = "" }: FormBoxProps) {
    return (
        <div className={`bg-white rounded-3xl shadow-sm border border-gray-200 p-4 ${className}`}>
            {children}
        </div>
    );
}
