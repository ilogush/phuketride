import { useSubmit } from "react-router";

/**
 * Shared hook for dictionary CRUD pages (brands, models, colors, hotels, etc.)
 * Eliminates boilerplate for handleFormSubmit and handleDelete patterns.
 */
export function useDictionaryFormActions<T extends { id: number }>({
    editingItem,
    setIsFormOpen,
    setEditingItem,
    idField = "id",
}: {
    editingItem: T | null;
    setIsFormOpen: (open: boolean) => void;
    setEditingItem?: (item: T | null) => void;
    idField?: string;
}) {
    const submit = useSubmit();

    const handleFormSubmit = (data: Record<string, unknown>) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        });
        formData.append("intent", editingItem ? "update" : "create");
        if (editingItem) {
            formData.append(idField, String(editingItem[idField as keyof T] ?? editingItem.id));
        }
        submit(formData, { method: "post" });
        setIsFormOpen(false);
        setEditingItem?.(null);
    };

    const handleDelete = (confirmMessage = "Are you sure you want to delete this item?") => {
        if (!editingItem) return;
        if (!confirm(confirmMessage)) return;
        const formData = new FormData();
        formData.append("intent", "delete");
        formData.append(idField, String(editingItem[idField as keyof T] ?? editingItem.id));
        submit(formData, { method: "post" });
        setIsFormOpen(false);
        setEditingItem?.(null);
    };

    return { handleFormSubmit, handleDelete };
}
