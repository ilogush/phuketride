import type { FormEventHandler, ReactNode } from "react";
import { Form } from "react-router";
import { PlusIcon } from "@heroicons/react/24/outline";
import Button from "~/components/dashboard/Button";
import Modal from "~/components/dashboard/Modal";
import PageHeader from "~/components/dashboard/PageHeader";

interface AdminCrudModalPageProps {
    title: string;
    addLabel?: string;
    onAdd: () => void;
    headerExtras?: ReactNode;
    tableContent: ReactNode;
    modalTitle: string;
    isModalOpen: boolean;
    onCloseModal: () => void;
    formIntent: string;
    editingId?: string | number | null;
    onFormSubmit?: FormEventHandler<HTMLFormElement>;
    formChildren: ReactNode;
    submitLabel: string;
    modalSize?: "sm" | "md" | "lg" | "xl" | "large";
}

export default function AdminCrudModalPage({
    title,
    addLabel = "Add",
    onAdd,
    headerExtras,
    tableContent,
    modalTitle,
    isModalOpen,
    onCloseModal,
    formIntent,
    editingId,
    onFormSubmit,
    formChildren,
    submitLabel,
    modalSize = "md",
}: AdminCrudModalPageProps) {
    return (
        <div className="space-y-4">
            <PageHeader
                title={title}
                rightActions={
                    <div className="flex gap-3">
                        {headerExtras}
                        <Button
                            variant="solid"
                            icon={<PlusIcon className="w-5 h-5" />}
                            onClick={onAdd}
                        >
                            {addLabel}
                        </Button>
                    </div>
                }
            />

            {tableContent}

            <Modal
                title={modalTitle}
                open={isModalOpen}
                onClose={onCloseModal}
                size={modalSize}
            >
                <Form method="post" className="space-y-4" onSubmit={onFormSubmit}>
                    <input type="hidden" name="intent" value={formIntent} />
                    {editingId != null && <input type="hidden" name="id" value={editingId} />}

                    {formChildren}

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="submit" variant="solid">
                            {submitLabel}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
