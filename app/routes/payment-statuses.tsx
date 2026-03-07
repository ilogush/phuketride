import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Payment Statuses — Phuket Ride Admin" },
    { name: "description", content: "Manage payment status types in the Phuket Ride dictionary." },
    { name: "robots", content: "noindex, nofollow" },
];
import { useState } from "react";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon, BanknotesIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";

type PaymentStatusRow = {
    id: number;
    name: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);

    return trackServerOperation({
        event: "payment_statuses.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "payment-statuses" },
        run: async () => {
            const statuses = await sdb.paymentStatuses.list();
            return { statuses };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { sdb } = await getScopedDb(request, context);
    const formData = await request.formData();

    const parsed = parseWithSchema(
        z.discriminatedUnion("intent", [
            z.object({
                intent: z.literal("delete"),
                id: z.coerce.number().int().positive(),
            }),
            z.object({
                intent: z.literal("create"),
                name: z.string().trim().min(1).max(100),
            }),
            z.object({
                intent: z.literal("update"),
                id: z.coerce.number().int().positive(),
                name: z.string().trim().min(1).max(100),
            }),
        ]),
        Object.fromEntries(formData),
        "Invalid action"
    );

    if (!parsed.ok) return redirectWithError("/payment-statuses", parsed.error);

    const data = parsed.data;

    if (data.intent === "delete") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("DELETE FROM payment_statuses WHERE id = ?").bind(data.id).run();
            },
            feedback: { successPath: "/payment-statuses", successMessage: "Status deleted", errorMessage: "Failed to delete" },
            audit: { entityType: "payment_status" as any, entityId: data.id, action: "delete" },
        });
    }

    if (data.intent === "create") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("INSERT INTO payment_statuses (name) VALUES (?)").bind(data.name).run();
            },
            feedback: { successPath: "/payment-statuses", successMessage: "Status created", errorMessage: "Failed to create" },
            audit: { entityType: "payment_status" as any, action: "create", afterState: data },
        });
    }

    if (data.intent === "update") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("UPDATE payment_statuses SET name = ? WHERE id = ?").bind(data.name, data.id).run();
            },
            feedback: { successPath: "/payment-statuses", successMessage: "Status updated", errorMessage: "Failed to update" },
            audit: { entityType: "payment_status" as any, entityId: data.id, action: "update", afterState: data },
        });
    }

    return redirectWithError("/payment-statuses", "Invalid action");
}

export default function PaymentStatusesPage() {
    const { statuses } = useLoaderData<typeof loader>();
    useUrlToast();
    const navigation = useNavigation();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingStatus, setEditingStatus] = useState<PaymentStatusRow | null>(null);

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingStatus,
        setIsFormOpen,
        setEditingItem: setEditingStatus,
    });

    const columns: Column<PaymentStatusRow>[] = [
        { key: "id", label: "ID", className: "w-16" },
        { 
            key: "name", 
            label: "Status Name",
            render: (item) => <span className="font-medium text-gray-900">{item.name}</span>
        },
    ];

    const fields: FieldConfig[] = [
        { name: "name", label: "Status Name", type: "text", required: true, placeholder: "e.g., Pending, Paid" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Payment Statuses"
                rightActions={
                    <Button 
                        variant="solid" 
                        icon={<PlusIcon className="w-5 h-5" />}
                        onClick={() => {
                            setEditingStatus(null);
                            setIsFormOpen(true);
                        }}
                    >
                        Add Status
                    </Button>
                }
            />

            <DataTable<PaymentStatusRow>
                data={statuses}
                columns={columns}
                totalCount={statuses.length}
                isLoading={navigation.state === "loading"}
                emptyTitle="No payment statuses found"
                emptyDescription="Define payment statuses for the system"
                emptyIcon={<BanknotesIcon className="w-10 h-10" />}
                getRowClassName={() => "cursor-pointer"}
                onRowClick={(item) => {
                    setEditingStatus(item);
                    setIsFormOpen(true);
                }}
            />

            {isFormOpen && (
                <GenericDictionaryForm
                    title={editingStatus ? "Edit Status" : "Add Status"}
                    fields={fields}
                    data={editingStatus ? { name: editingStatus.name } : null}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsFormOpen(false)}
                    onDelete={editingStatus ? () => handleDelete("Delete this status?") : undefined}
                />
            )}
        </div>
    );
}
