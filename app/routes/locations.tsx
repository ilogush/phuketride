import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, Form, useSubmit, useNavigation } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Locations — Phuket Ride Admin" },
    { name: "description", content: "Manage delivery zones and locations in Phuket Ride." },
    { name: "robots", content: "noindex, nofollow" },
];
import PageHeader from '~/components/shared/ui/PageHeader';
import Button from '~/components/shared/ui/Button';
import DataTable, { type Column } from '~/components/dashboard/data-table/DataTable';
import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import Toggle from '~/components/shared/ui/Toggle';
import type { LocationsPageDistrict as District } from "~/lib/admin-dictionaries";
import { useAsyncToastAction } from "~/lib/useAsyncToastAction";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, isModMode, sdb } = await getScopedDb(request, context, async (r) => {
        const { requireLocationsAccess } = await import("~/lib/access-policy.server");
        return requireLocationsAccess(r);
    });

    return trackServerOperation({
        event: "locations.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "locations" },
        run: async () => sdb.locations.getPageData({ user, companyId, isModMode }),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, isModMode, sdb } = await getScopedDb(request, context, async (r) => {
        const { requireLocationsAccess } = await import("~/lib/access-policy.server");
        return requireLocationsAccess(r);
    });

    const formData = await request.formData();
    return sdb.locations.handleAction({
        user,
        formData,
        companyId,
        isModMode,
    });
}

export default function LocationsPage() {
    const { districts, user, isModMode } = useLoaderData<typeof loader>();
    const submit = useSubmit();
    const navigation = useNavigation();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [localDistricts, setLocalDistricts] = useState(districts);
    const { notifySuccess } = useAsyncToastAction();

    const isAdmin = user.role === "admin" && !isModMode;
    const isPartner = user.role === "partner" || isModMode;

    const parseBeaches = (beaches: string | null): string[] => {
        if (!beaches) return [];
        try {
            return JSON.parse(beaches);
        } catch {
            return [];
        }
    };

    const parseStreets = (streets: string | null): string[] => {
        if (!streets) return [];
        try {
            return JSON.parse(streets);
        } catch {
            return [];
        }
    };

    const handleToggleStatus = (id: number, currentStatus: boolean) => {
        const district = localDistricts.find(d => d.id === id);
        const newStatus = !currentStatus;
        
        setLocalDistricts(prev => 
            prev.map(d => d.id === id ? { ...d, isActive: newStatus } : d)
        );

        if (district) {
            void notifySuccess(`${district.name} ${newStatus ? 'activated' : 'deactivated'}`, 3000);
        }
    };

    const handlePriceChange = (id: number, price: string) => {
        const numPrice = Number(price) || 0;
        setLocalDistricts(prev => 
            prev.map(d => d.id === id ? { ...d, deliveryPrice: numPrice } : d)
        );
    };

    const handleSaveAll = async () => {
        const form = document.getElementById("bulk-update-form") as HTMLFormElement;
        if (form) {
            form.requestSubmit();
        }
    };

    const handleEdit = (district: District) => {
        setEditingDistrict(district);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDistrict(null);
    };

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingDistrict,
        setIsFormOpen: setIsModalOpen,
        setEditingItem: setEditingDistrict,
    });

    const fields: FieldConfig[] = [
        { name: "name", label: "District Name", type: "text", required: true, placeholder: "e.g., Patong" },
        { name: "beaches", label: "Beaches / Locations (comma separated)", type: "textarea", required: true, rows: 3, placeholder: "e.g., Patong Beach, Kalim Beach" },
        { name: "streets", label: "Streets / Roads (comma separated)", type: "textarea", rows: 3, placeholder: "e.g., Bangla Road, Beach Road" },
        { name: "deliveryPrice", label: "Delivery Price (฿)", type: "number", required: true, placeholder: "e.g., 600" },
    ];

    const columns: Column<District>[] = [
        {
            key: "name",
            label: "District",
            render: (item) => <span className="font-medium">{item.name}</span>,
        },
        {
            key: "beaches",
            label: "Beaches / Locations",
            render: (item) => {
                const beaches = parseBeaches(item.beaches);
                return <span className="text-sm">{beaches.join(", ")}</span>;
            },
            wrap: true,
        },
        {
            key: "streets",
            label: "Streets / Roads",
            render: (item) => {
                const streets = parseStreets(item.streets);
                return <span className="text-sm">{streets.join(", ")}</span>;
            },
            wrap: true,
            className: "hidden lg:table-cell",
        },
        ...(!isAdmin
            ? [
                {
                    key: "status",
                    label: "Status",
                    render: (item: District) => {
                        const district = localDistricts.find(d => d.id === item.id) || item;
                        return (
                            <Toggle
                                size="sm"
                                checked={Boolean(district.isActive)}
                                onCheckedChange={() => handleToggleStatus(item.id, district.isActive ?? false)}
                            />
                        );
                    },
                },
                {
                    key: "deliveryPrice",
                    label: "Cost",
                    render: (item: District) => {
                        const district = localDistricts.find(d => d.id === item.id) || item;
                        return (
                            <div className="relative max-w-[120px]">
                                <input
                                    type="number"
                                    value={district.deliveryPrice || 0}
                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                    disabled={!district.isActive}
                                    className="block w-full h-11 rounded-2xl border border-gray-200 sm:text-sm px-4 bg-white text-gray-700 focus:ring-4 focus:ring-gray-900/5 focus:border-gray-900 focus:outline-none transition-colors placeholder:text-xs placeholder:font-normal placeholder:normal-case placeholder:text-gray-400 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
                                    ฿
                                </span>
                            </div>
                        );
                    },
                    className: "hidden sm:table-cell",
                },
            ]
            : []),
        ...(isAdmin
            ? [
                {
                    key: "actions",
                    label: "Actions",
                    render: (item: District) => (
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(item)}
                            >
                                Edit
                            </Button>
                        </div>
                    ),
                },
            ]
            : []),
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Delivery"
                rightActions={
                    <div className="flex gap-2">
                        {isPartner && (
                            <Button 
                                variant="solid" 
                                onClick={handleSaveAll}
                                loading={navigation.state === "submitting"}
                            >
                                Save
                            </Button>
                        )}
                        {isAdmin && (
                            <Button variant="outline" icon={<PlusIcon className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
                                Add
                            </Button>
                        )}
                    </div>
                }
            />

            <Form id="bulk-update-form" method="post" className="hidden">
                <input type="hidden" name="intent" value="bulkUpdate" />
                <input type="hidden" name="updates" value={JSON.stringify(
                    localDistricts.map(d => ({
                        id: d.id,
                        isActive: d.isActive,
                        deliveryPrice: d.deliveryPrice
                    }))
                )} />
            </Form>

            <DataTable
                data={localDistricts}
                columns={columns}
                isLoading={navigation.state === "loading"}
                emptyTitle="No districts found"
                emptyDescription="Start by adding your first district"
            />

            {isAdmin && isModalOpen && (
                <GenericDictionaryForm
                    title={editingDistrict ? "Edit District" : "Add District"}
                    fields={fields}
                    data={editingDistrict ? {
                        name: editingDistrict.name,
                        beaches: parseBeaches(editingDistrict.beaches).join(", "),
                        streets: parseStreets(editingDistrict.streets).join(", "),
                        deliveryPrice: String(editingDistrict.deliveryPrice || "0")
                    } : null}
                    onSubmit={handleFormSubmit}
                    onCancel={handleCloseModal}
                    onDelete={editingDistrict ? () => handleDelete("Delete this district?") : undefined}
                />
            )}
        </div>
    );
}
