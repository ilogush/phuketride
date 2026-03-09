interface ReadOnlyFieldProps {
    label: string;
    value: string | number | null | undefined;
    className?: string;
    capitalize?: boolean;
}

export default function ReadOnlyField({
    label,
    value,
    className = "",
    capitalize = false
}: ReadOnlyFieldProps) {
    const displayValue = value || '-';

    return (
        <div className={className}>
            <label className="block text-xs text-gray-600 mb-1">{label}</label>
            <div className={`px-4 py-2.5 bg-gray-50 rounded-3xl text-sm text-gray-900 ${capitalize ? 'capitalize' : ''}`}>
                {displayValue}
            </div>
        </div>
    );
}
