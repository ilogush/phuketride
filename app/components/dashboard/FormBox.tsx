interface FormBoxProps {
    children: React.ReactNode;
    className?: string;
}

export default function FormBox({ children, className = "" }: FormBoxProps) {
    return (
        <div className={`bg-white rounded-3xl shadow-sm p-4 ${className}`}>
            {children}
        </div>
    );
}
