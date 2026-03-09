import Toggle from "~/components/shared/ui/Toggle";

interface ToggleFieldProps {
    label: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    enabledLabel?: string;
    disabledLabel?: string;
    className?: string;
    disabled?: boolean;
}

export default function ToggleField({
    label,
    checked,
    onCheckedChange,
    enabledLabel = "Enabled",
    disabledLabel = "Disabled",
    className = "",
    disabled = false,
}: ToggleFieldProps) {
    return (
        <div className={className}>
            <label className="block text-xs text-gray-600 mb-1 ml-1">{label}</label>
            <div className="flex h-11 items-center justify-between rounded-2xl border border-gray-200 bg-white px-4">
                <span className="text-sm text-gray-900">{checked ? enabledLabel : disabledLabel}</span>
                <Toggle checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
            </div>
        </div>
    );
}
