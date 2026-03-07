import { useMemo, useState } from "react";
import type { AssignableUser } from "~/components/dashboard/company/AssignUsersSection";

export function useCompanyManagerAssignment(users: AssignableUser[], initialLocationId: number) {
    const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
    const [selectedManager, setSelectedManager] = useState<AssignableUser | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return [];

        const searchLower = searchQuery.toLowerCase();
        return users.filter((user) => {
            if (selectedManager?.id === user.id) return false;

            const fullName = `${user.name || ""} ${user.surname || ""}`.toLowerCase();
            return user.email.toLowerCase().includes(searchLower) || fullName.includes(searchLower);
        });
    }, [searchQuery, selectedManager, users]);

    return {
        selectedLocationId,
        setSelectedLocationId,
        selectedManager,
        searchQuery,
        showSuggestions,
        filteredUsers,
        setSearchQuery,
        setShowSuggestions,
        handleSelectManager(user: AssignableUser) {
            setSelectedManager(user);
            setSearchQuery("");
            setShowSuggestions(false);
        },
        handleRemoveManager() {
            setSelectedManager(null);
        },
    };
}
