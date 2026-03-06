import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import AdminCrudModalPage from "~/components/dashboard/AdminCrudModalPage";
import { ClockIcon as HeroClockIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { useCrudModal } from "~/lib/useCrudModal";
import { handleDurationsAction } from "~/lib/durations-actions.server";
import { loadAdminPageData, requireAdminDb } from "~/lib/admin-crud.server";
import { loadAdminDurations, type AdminDurationRow } from "~/lib/admin-dictionaries.server";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";

type RentalDuration = AdminDurationRow;

export async function loader({ request, context }: LoaderFunctionArgs) {
    await requireAdmin(request);
    return loadAdminPageData({
        request,
        context,
        loaders: {
            durations: loadAdminDurations,
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    await requireAdmin(request);
    const { db } = await requireAdminDb(request, context);
    const formData = await request.formData();
    parseWithSchema(
        z.object({
            intent: z.string().min(1),
        }),
        {
            intent: formData.get("intent"),
        },
        "Invalid action"
    );
    return handleDurationsAction({ db, formData });
}

export default function DurationsPage() {
    const { durations } = useLoaderData<typeof loader>();
    useUrlToast();
    const {
        isModalOpen,
        editingEntity: editingDuration,
        formData,
        setFormData,
        openCreateModal,
        openEditModal,
        closeModal,
    } = useCrudModal<RentalDuration, { rangeName: string; minDays: string; maxDays: string; priceMultiplier: string; discountLabel: string }>({
        initialFormData: {
            rangeName: "",
            minDays: "",
            maxDays: "",
            priceMultiplier: "1",
            discountLabel: "",
        },
        mapEntityToFormData: (duration) => ({
            rangeName: duration.rangeName,
            minDays: String(duration.minDays),
            maxDays: duration.maxDays ? String(duration.maxDays) : "",
            priceMultiplier: String(duration.priceMultiplier),
            discountLabel: duration.discountLabel || "",
        }),
    });

    const columns: Column<RentalDuration>[] = [
        {
            key: "rangeName",
            label: "Range Name",
            render: (item) => {
                const daysCount = item.maxDays
                    ? item.maxDays - item.minDays + 1
                    : null;
                const daysText = daysCount ? ` (${daysCount} days)` : ' (unlimited)';
                return (
                    <span className="font-medium text-gray-900">
                        {item.rangeName}{daysText}
                    </span>
                );
            },
        },
        {
            key: "minDays",
            label: "Min Days",
            render: (item) => (
                <span className="text-gray-700">{item.minDays}</span>
            ),
        },
        {
            key: "maxDays",
            label: "Max Days (0 = unlimited)",
            render: (item) => (
                <span className="text-gray-700">{item.maxDays || "0"}</span>
            ),
        },
        {
            key: "priceMultiplier",
            label: "Price Multiplier",
            render: (item) => (
                <span className="text-gray-700">{item.priceMultiplier}</span>
            ),
        },
        {
            key: "discountLabel",
            label: "Discount Label",
            render: (item) => (
                <span className="text-gray-600">{item.discountLabel || "-"}</span>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (item) => (
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => openEditModal(item)}
                >
                    Edit
                </Button>
            ),
        },
    ];

    return (
        <AdminCrudModalPage
            title="Rental Durations"
            addLabel="Add"
            onAdd={openCreateModal}
            headerExtras={
                durations.length === 0 ? (
                    <Form method="post">
                        <input type="hidden" name="intent" value="seed" />
                        <Button type="submit" variant="secondary">
                            Load Default Data
                        </Button>
                    </Form>
                ) : null
            }
            tableContent={
                durations.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={durations}
                        disablePagination={true}
                        emptyTitle="No durations configured"
                        emptyDescription="Add rental duration periods to get started"
                    />
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm p-12 py-4">
                        <div className="text-center">
                            <ClockIcon />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No durations configured</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Set up rental duration periods and pricing rules
                            </p>
                        </div>
                    </div>
                )
            }
            modalTitle={editingDuration ? "Edit Rental Duration" : "Add Rental Duration"}
            isModalOpen={isModalOpen}
            onCloseModal={closeModal}
            formIntent={editingDuration ? "update" : "create"}
            editingId={editingDuration?.id}
            onFormSubmit={closeModal}
            submitLabel={editingDuration ? "Update Duration" : "Create Duration"}
            formChildren={
                <>
                    <Input
                        label="Range Name"
                        name="rangeName"
                        value={formData.rangeName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rangeName: e.target.value })}
                        placeholder="e.g., 1-3 days"
                        required
                    />

                    <Input
                        label="Min Days"
                        name="minDays"
                        type="number"
                        value={formData.minDays}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, minDays: e.target.value })}
                        placeholder="1"
                        required
                    />

                    <Input
                        label="Max Days (0 = unlimited)"
                        name="maxDays"
                        type="number"
                        value={formData.maxDays}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, maxDays: e.target.value })}
                    />

                    <Input
                        label="Price Multiplier"
                        name="priceMultiplier"
                        type="number"
                        step="0.01"
                        value={formData.priceMultiplier}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, priceMultiplier: e.target.value })}
                        placeholder="1"
                        required
                    />

                    <Input
                        label="Discount Label"
                        name="discountLabel"
                        value={formData.discountLabel}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, discountLabel: e.target.value })}
                        placeholder="e.g., -5%"
                    />
                </>
            }
        />
    );
}

function ClockIcon() {
    return (
        <HeroClockIcon className="w-10 h-10 mx-auto text-gray-400" />
    );
}
