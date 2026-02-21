import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSearchParams } from "react-router";
import { useEffect, useState } from "react";
import Button from "~/components/dashboard/Button";

interface SearchInputProps {
    placeholder?: string;
    paramName?: string;
    onSearch?: (value: string) => void;
}

export default function SearchInput({ 
    placeholder = "Search...", 
    paramName = "search",
    onSearch 
}: SearchInputProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [value, setValue] = useState(searchParams.get(paramName) || "");

    useEffect(() => {
        setValue(searchParams.get(paramName) || "");
    }, [searchParams, paramName]);

    const handleSearch = (newValue: string) => {
        setValue(newValue);
        
        const params = new URLSearchParams(searchParams);
        if (newValue) {
            params.set(paramName, newValue);
        } else {
            params.delete(paramName);
        }
        
        // Reset to first page when searching
        params.delete("page");
        
        setSearchParams(params);
        
        if (onSearch) {
            onSearch(newValue);
        }
    };

    const handleClear = () => {
        handleSearch("");
    };

    return (
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                value={value}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={placeholder}
                className="block w-full pl-10 pr-10 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-gray-800 focus:border-transparent"
            />
            {value && (
                <Button
                    type="button"
                    variant="unstyled"
                    onClick={handleClear}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                    <XMarkIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                </Button>
            )}
        </div>
    );
}
