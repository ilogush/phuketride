import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Seasons — Phuket Ride Admin" },
    { name: "description", content: "Manage rental seasons and seasonal pricing in Phuket Ride." },
    { name: "robots", content: "noindex, nofollow" },
];
import { useState } from "react";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon, SunIcon } from "@heroicons/react/24/outline";
import type { AdminSeasonRow } from "~/lib/admin-dictionaries";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";
import { useSubmit } from "react-router";

type Season = AdminSeasonRow;

const MONTHS = [
    { value: "1", label: "Jan" },
    { value: "2", label: "Feb" },
    { value: "3", label: "Mar" },
    { value: "4", label: "Apr" },
    { value: "5", label: "May" },
    { value: "6", label: "Jun" },
    { value: "7", label: "Jul" },
    { value: "8", label: "Aug" },
    { value: "9", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
}));

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);

    return trackServerOperation({
        event: "seasons.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "seasons" },
        run: async () => {
            const seasons = await sdb.seasons.list();
            return {
                user,
                seasons: seasons as Season[],
            };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { sdb } = await getScopedDb(request, context);
    const formData = await request.formData();
    return sdb.seasons.handleAction({ request, formData });
}

export default function SeasonsPage() {
    const { seasons } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const submit = useSubmit();


    const [editingSeason, setEditingSeason] = useState<Season | null>(null);

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingSeason,
        setIsFormOpen: () => {}, // No longer used
        setEditingItem: setEditingSeason,
    });

    const columns: Column<Season>[] = [
        {
            key: "seasonName",
            label: "Season Name",
            render: (item) => <span className="font-medium text-gray-900">{item.seasonName}</span>,
        },
        {
            key: "startDate",
            label: "Start Date",
            render: (item) => (
                <span className="text-gray-700">
                    {MONTHS[item.startMonth - 1]?.label} {item.startDay}
                </span>
            ),
        },
        {
            key: "endDate",
            label: "End Date",
            render: (item) => (
                <span className="text-gray-700">
                    {MONTHS[item.endMonth - 1]?.label} {item.endDay}
                </span>
            ),
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
        { name: "seasonName", label: "Season Name", type: "text", required: true, className: "col-span-4", placeholder: "e.g., Peak Season" },
        { 
            name: "startMonth", 
            label: "Start Month", 
            type: "select", 
            options: MONTHS.map(m => ({ id: m.value, name: m.label })), 
            required: true,
            className: "col-span-2"
        },
        { 
            name: "startDay", 
            label: "Start Day", 
            type: "select", 
            options: DAYS.map(d => ({ id: d.value, name: d.label })), 
            required: true,
            className: "col-span-2"
        },
        { 
            name: "endMonth", 
            label: "End Month", 
            type: "select", 
            options: MONTHS.map(m => ({ id: m.value, name: m.label })), 
            required: true,
            className: "col-span-2"
        },
        { 
            name: "endDay", 
            label: "End Day", 
            type: "select", 
            options: DAYS.map(d => ({ id: d.value, name: d.label })), 
            required: true,
            className: "col-span-2"
        },
        { name: "priceMultiplier", label: "Price Multiplier", type: "number", step: "0.01", required: true, className: "col-span-4", placeholder: "1" },
        { name: "discountLabel", label: "Discount Label", type: "text", className: "col-span-4", placeholder: "e.g., +50%" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Seasons"
                rightActions={
                    <div className="flex gap-2">
                        {seasons.length === 0 && (
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
                    <DataTable<Season>
                        columns={columns}
                        data={seasons}
                        isLoading={navigation.state === "loading"}
                        emptyTitle="No seasons found"
                        emptyDescription="Define seasonal pricing periods for your rental business"
                        emptyIcon={<SunIcon className="w-10 h-10 text-gray-400" />}
                        getRowClassName={() => "cursor-pointer"}
                        onRowClick={(item) => {
                            setEditingSeason(item);
                        }}
                    />
                </div>

                <div className="w-full lg:w-80 shrink-0">
                    <GenericDictionaryForm
                        mode="sidebar"
                        title={editingSeason ? "Edit Season" : "Add Season"}
                        fields={fields}
                        gridCols={4}
                        data={editingSeason ? {
                            seasonName: editingSeason.seasonName,
                            startMonth: String(editingSeason.startMonth),
                            startDay: String(editingSeason.startDay),
                            endMonth: String(editingSeason.endMonth),
                            endDay: String(editingSeason.endDay),
                            priceMultiplier: String(editingSeason.priceMultiplier),
                            discountLabel: editingSeason.discountLabel || ""
                        } : {
                            startMonth: "12",
                            startDay: "1",
                            endMonth: "1",
                            endDay: "31",
                            priceMultiplier: "1"
                        }}
                        onSubmit={handleFormSubmit}
                        onCancel={() => { setEditingSeason(null); }}
                        onDelete={editingSeason ? () => handleDelete("Delete this season?") : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
