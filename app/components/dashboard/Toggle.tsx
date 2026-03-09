interface ToggleProps {
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    size?: 'sm' | 'md'
    className?: string
    id?: string
    name?: string
    ariaLabel?: string
}

export default function Toggle({
    checked,
    onCheckedChange,
    disabled = false,
    size = 'sm',
    className = '',
    id,
    name,
    ariaLabel
}: ToggleProps) {
    const sizeClass = size === 'md'
        ? { root: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-[20px]', off: 'translate-x-0' }
        : { root: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-[16px]', off: 'translate-x-0' };

    return (
        <button
            type="button"
            id={id}
            name={name}
            onClick={() => !disabled && onCheckedChange(!checked)}
            disabled={disabled}
            className={`
                relative inline-flex items-center flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-4 focus:ring-gray-900/5
                ${checked ? 'bg-gray-900' : 'bg-gray-200'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${sizeClass.root}
                ${className}
            `}
            role="switch"
            aria-label={ariaLabel}
            aria-checked={checked}
        >
            <span
                className={`
                    pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ml-0.5
                    ${sizeClass.knob}
                    ${checked ? sizeClass.on : sizeClass.off}
                `}
            />
        </button>
    )
}
