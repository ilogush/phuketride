import { UserIcon } from "@heroicons/react/24/outline";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import { Input } from "~/components/dashboard/Input";
import ReadOnlyField from "~/components/dashboard/ReadOnlyField";
import { formatContactPhone } from "~/lib/phone";

export interface AssignableUser {
  id: string;
  email: string;
  name: string | null;
  surname: string | null;
  role: string;
  phone: string | null;
}

type AssignUsersSectionProps = {
  selectedManager: AssignableUser | null;
  searchQuery: string;
  showSuggestions: boolean;
  filteredUsers: AssignableUser[];
  onSearchQueryChange: (value: string) => void;
  onFocusSearch: () => void;
  onSelectManager: (user: AssignableUser) => void;
  onRemoveManager: () => void;
};

export default function AssignUsersSection({
  selectedManager,
  searchQuery,
  showSuggestions,
  filteredUsers,
  onSearchQueryChange,
  onFocusSearch,
  onSelectManager,
  onRemoveManager,
}: AssignUsersSectionProps) {
  return (
    <FormSection title="Assign Users" icon={<UserIcon />}>
      <div className="space-y-4">
        {!selectedManager ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Input
                label="Search Users"
                name="userSearch"
                placeholder="Type email or name..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onFocus={onFocusSearch}
                autoComplete="off"
              />

              {showSuggestions && searchQuery && filteredUsers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {filteredUsers.slice(0, 10).map((user) => (
                    <Button
                      key={user.id}
                      type="button"
                      variant="plain"
                      onClick={() => onSelectManager(user)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {user.name && user.surname ? `${user.name} ${user.surname}` : user.email}
                      </div>
                      <div className="text-xs text-gray-500">
                        {user.email} • {user.role}
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <input type="hidden" name="managerIds" value={selectedManager.id} />
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs text-gray-600">Assigned User</label>
              <Button
                type="button"
                variant="outline"
                onClick={onRemoveManager}
              >
                Remove
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReadOnlyField label="Name" value={selectedManager.name} />
              <ReadOnlyField label="Surname" value={selectedManager.surname} />
              <ReadOnlyField label="Email" value={selectedManager.email} />
              <ReadOnlyField label="Phone" value={formatContactPhone(selectedManager.phone)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <ReadOnlyField label="Role" value={selectedManager.role} capitalize />
            </div>
          </div>
        )}
      </div>
    </FormSection>
  );
}
