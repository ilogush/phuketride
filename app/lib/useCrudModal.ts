import { useState } from "react";

interface UseCrudModalOptions<TEntity, TFormData> {
    initialFormData: TFormData;
    mapEntityToFormData: (entity: TEntity) => TFormData;
}

export function useCrudModal<TEntity, TFormData>({
    initialFormData,
    mapEntityToFormData,
}: UseCrudModalOptions<TEntity, TFormData>) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEntity, setEditingEntity] = useState<TEntity | null>(null);
    const [formData, setFormData] = useState<TFormData>(initialFormData);

    const openCreateModal = () => {
        setEditingEntity(null);
        setFormData(initialFormData);
        setIsModalOpen(true);
    };

    const openEditModal = (entity: TEntity) => {
        setEditingEntity(entity);
        setFormData(mapEntityToFormData(entity));
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingEntity(null);
        setFormData(initialFormData);
    };

    return {
        isModalOpen,
        editingEntity,
        formData,
        setFormData,
        openCreateModal,
        openEditModal,
        closeModal,
    };
}
