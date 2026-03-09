import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

interface PageSearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export default function PageSearchInput({
    value,
    onChange,
    placeholder = "Search...",
    className = "",
}: PageSearchInputProps) {
    return (
        <div className={`relative hidden sm:block h-11 min-w-[14rem] ${className}`.trim()}>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-full w-full rounded-2xl border border-gray-200 bg-white py-2.5 pl-4 pr-18 text-sm text-gray-900 transition-all duration-200 placeholder:text-xs placeholder:font-normal placeholder:normal-case placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-4 focus:ring-gray-900/5"
            />
            <div className="absolute inset-y-2 right-1.5 flex items-center gap-1">
                {value ? (
                    <button
                        type="button"
                        onClick={() => onChange("")}
                        className="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900"
                        aria-label="Clear search"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                ) : null}
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-white">
                    <MagnifyingGlassIcon className="h-4 w-4" />
                </div>
            </div>
        </div>
    );
}
