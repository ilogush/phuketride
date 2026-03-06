interface ToggleProps {
    enabled: boolean
    onChange: (enabled: boolean) => void
    disabled?: boolean
    size?: 'sm' | 'md'
    className?: string
}

export default function Toggle({
    enabled,
    onChange,
    disabled = false,
    size = 'sm',
    className = ''
}: ToggleProps) {
    const sizeClass = size === 'md'
        ? { root: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-5', off: 'translate-x-0' }
        : { root: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-4', off: 'translate-x-0' };

    return (
        <button
            type="button"
            onClick={() => !disabled && onChange(!enabled)}
            disabled={disabled}
            className={`
        relative inline-flex flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
        ${enabled ? 'bg-gray-800' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${sizeClass.root}
        ${className}
      `}
            role="switch"
            aria-checked={enabled}
        >
            <span
                className={`
          pointer-events-none inline-block transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
          ${sizeClass.knob}
          ${enabled ? sizeClass.on : sizeClass.off}
        `}
            />
        </button>
    )
}
