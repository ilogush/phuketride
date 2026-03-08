import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation, useSubmit } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Rental Durations — Phuket Ride Admin" },
    { name: "description", content: "Manage rental duration tiers and discounts in Phuket Ride." },
    { name: "robots", content: "noindex, nofollow" },
];
import { useState } from "react";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon, ClockIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import type { AdminDurationRow } from "~/lib/admin-dictionaries";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { z } from "zod";
import { redirectWithError } from "~/lib/route-feedback";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";
import type { AdminLocationRow } from "~/lib/admin-dictionaries";

type RentalDuration = AdminDurationRow;
type Duration = AdminDurationRow; // Alias for clarity in loader return type

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);

    return trackServerOperation({
        event: "durations.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "durations" },
        run: async () => {
            const [durations, locations] = await Promise.all([
                sdb.durations.list(),
                sdb.locations.list(),
            ]);

            return {
                user,
                durations: durations as Duration[],
                locations: locations as AdminLocationRow[],
            };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { sdb } = await getScopedDb(request, context);
    const formData = await request.formData();
    return sdb.durations.handleAction({ request, formData });
}

export default function DurationsPage() {
    const { durations } = useLoaderData<typeof loader>();
    useUrlToast();
    const submit = useSubmit();
    const navigation = useNavigation();

    const [editingDuration, setEditingDuration] = useState<RentalDuration | null>(null);

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingDuration,
        setIsFormOpen: () => {}, // No longer used
        setEditingItem: setEditingDuration,
    });

    const columns: Column<RentalDuration>[] = [
        {
            key: "rangeName",
            label: "Range Name",
            render: (item) => {
                const daysCount = item.maxDays ? item.maxDays - item.minDays + 1 : null;
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
            render: (item) => <span className="text-gray-700">{item.minDays}</span>,
        },
        {
            key: "maxDays",
            label: "Max Days (0 = unlimited)",
            render: (item) => <span className="text-gray-700">{item.maxDays || "0"}</span>,
        },
        {
            key: "priceMultiplier",
            label: "Price Multiplier",
            render: (item) => <span className="text-gray-700">{item.priceMultiplier}</span>,
        },
        {
            key: "discountLabel",
            label: "Discount Label",
            render: (item) => <span className="text-gray-600">{item.discountLabel || "-"}</span>,
        },
    ];

    const fields: FieldConfig[] = [
        { name: "rangeName", label: "Range Name", type: "text", required: true, placeholder: "e.g., 1-3 days" },
        { name: "minDays", label: "Min Days", type: "number", required: true, placeholder: "1" },
        { name: "maxDays", label: "Max Days (0 = unlimited)", type: "number" },
        { name: "priceMultiplier", label: "Price Multiplier", type: "number", step: "0.01", required: true, placeholder: "1" },
        { name: "discountLabel", label: "Discount Label", type: "text", placeholder: "e.g., -5%" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Rental Durations"
                rightActions={
                    <div className="flex gap-2">
                        {durations.length === 0 && (
                            <Button variant="outline" onClick={() => {
                                const fd = new FormData();
                                fd.append("intent", "seed");
                                submit(fd, { method: "post" });
                            }}>
                                Seed Defaults
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                    <DataTable<RentalDuration>
                        columns={columns}
                        data={durations}
                        isLoading={navigation.state === "loading"}
                        emptyTitle="No durations found"
                        emptyDescription="Add rental duration periods to get started"
                        emptyIcon={<ClockIcon className="w-10 h-10 text-gray-400" />}
                        getRowClassName={() => "cursor-pointer"}
                        onRowClick={(item) => {
                            setEditingDuration(item);
                        }}
                    />
                </div>

                <div className="w-full lg:w-80 shrink-0">
                    <GenericDictionaryForm
                        mode="sidebar"
                        title={editingDuration ? "Edit Rental Duration" : "Add Rental Duration"}
                        fields={fields}
                        data={editingDuration ? {
                            rangeName: editingDuration.rangeName,
                            minDays: String(editingDuration.minDays),
                            maxDays: editingDuration.maxDays ? String(editingDuration.maxDays) : "0",
                            priceMultiplier: String(editingDuration.priceMultiplier),
                            discountLabel: editingDuration.discountLabel || ""
                        } : null}
                        onSubmit={handleFormSubmit}
                        onCancel={() => { setEditingDuration(null); }}
                        onDelete={editingDuration ? () => handleDelete("Delete this duration?") : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
