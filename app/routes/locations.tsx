import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import { useState } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import Toggle from "~/components/dashboard/Toggle";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { handleLocationsAction } from "~/lib/locations-actions.server";
import DistrictModal from "~/components/dashboard/locations/DistrictModal";

interface District {
    id: number;
    name: string;
    locationId: number;
    beaches: string | null;
    streets: string | null;
    isActive: boolean;
    deliveryPrice: number | null;
    createdAt: Date;
    updatedAt: Date;
}
type PartnerDistrictSettingRow = {
    id: number;
    name: string;
    location_id: number;
    beaches: string | null;
    streets: string | null;
    company_is_active: number | null;
    company_delivery_price: number | null;
    district_is_active: number;
    district_delivery_price: number | null;
    created_at: Date;
    updated_at: Date;
};
type AdminDistrictRow = {
    id: number;
    name: string;
    location_id: number;
    beaches: string | null;
    streets: string | null;
    is_active: number;
    delivery_price: number | null;
    created_at: Date;
    updated_at: Date;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);
    const isModMode = user.role === "admin" && effectiveCompanyId !== null;

    let districts: District[] = [];

    if (user.role === "partner" || isModMode) {
        if (effectiveCompanyId) {
            // Load all districts and overlay company-specific settings when available.
            const settings = await context.cloudflare.env.DB
                .prepare(`
                    SELECT
                        d.id,
                        d.name,
                        d.location_id,
                        d.beaches,
                        d.streets,
                        cds.is_active AS company_is_active,
                        cds.delivery_price AS company_delivery_price,
                        d.is_active AS district_is_active,
                        d.delivery_price AS district_delivery_price,
                        d.created_at,
                        d.updated_at
                    FROM districts d
                    LEFT JOIN company_delivery_settings cds
                        ON cds.district_id = d.id AND cds.company_id = ?
                    WHERE d.location_id = 1
                    LIMIT ${QUERY_LIMITS.LARGE}
                `)
                .bind(effectiveCompanyId)
                .all() as { results?: PartnerDistrictSettingRow[] };
            districts = (settings.results || []).map((s: PartnerDistrictSettingRow) => ({
                id: s.id,
                name: s.name,
                locationId: s.location_id,
                beaches: s.beaches,
                streets: s.streets,
                isActive: s.company_is_active === null || s.company_is_active === undefined
                    ? !!s.district_is_active
                    : !!s.company_is_active,
                deliveryPrice: s.company_delivery_price === null || s.company_delivery_price === undefined
                    ? s.district_delivery_price
                    : s.company_delivery_price,
                createdAt: s.created_at,
                updatedAt: s.updated_at,
            }));
        }
    } else {
        // Admin sees all districts
        const districtsRaw = await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id,
                    name,
                    location_id,
                    beaches,
                    streets,
                    is_active,
                    delivery_price,
                    created_at,
                    updated_at
                FROM districts
                WHERE location_id = 1
                LIMIT ${QUERY_LIMITS.LARGE}
                `)
            .all() as { results?: AdminDistrictRow[] };
        districts = (districtsRaw.results || []).map((d: AdminDistrictRow) => ({
            id: d.id,
            name: d.name,
            locationId: d.location_id,
            beaches: d.beaches,
            streets: d.streets,
            isActive: !!d.is_active,
            deliveryPrice: d.delivery_price,
            createdAt: d.created_at,
            updatedAt: d.updated_at,
        }));
    }

    return { districts, user, isModMode };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const effectiveCompanyId = getEffectiveCompanyId(request, user);
    const isModMode = user.role === "admin" && effectiveCompanyId !== null;
    const formData = await request.formData();
    return handleLocationsAction({
        context,
        user,
        formData,
        effectiveCompanyId,
        isModMode,
    });
}

export default function LocationsPage() {
    const { districts, user, isModMode } = useLoaderData<typeof loader>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [formData, setFormData] = useState({ name: "", beaches: "", streets: "", deliveryPrice: "0" });
    const [localDistricts, setLocalDistricts] = useState(districts);
    const toast = useToast();

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
            toast.success(`${district.name} ${newStatus ? 'activated' : 'deactivated'}`, 3000);
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
        const beaches = parseBeaches(district.beaches);
        const streets = parseStreets(district.streets);
        setFormData({
            name: district.name,
            beaches: beaches.join(", "),
            streets: streets.join(", "),
            deliveryPrice: String(district.deliveryPrice || 0)
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDistrict(null);
        setFormData({ name: "", beaches: "", streets: "", deliveryPrice: "0" });
    };

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
                                enabled={Boolean(district.isActive)}
                                onChange={() => handleToggleStatus(item.id, district.isActive ?? false)}
                            />
                        );
                    },
                },
                {
                    key: "deliveryPrice",
                    label: "Cost (฿)",
                    render: (item: District) => {
                        const district = localDistricts.find(d => d.id === item.id) || item;
                        return (
                            <div className="relative max-w-[120px]">
                                <input
                                    type="number"
                                    value={district.deliveryPrice || 0}
                                    onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                    disabled={!district.isActive}
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-xs placeholder:text-gray-500 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
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
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleEdit(item)}
                        >
                            Edit
                        </Button>
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
                            <Button variant="primary" onClick={handleSaveAll}>
                                Save
                            </Button>
                        )}
                        {isAdmin && (
                            <Button variant="secondary" icon={<PlusIcon className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
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
                disablePagination={true}
                emptyTitle="No districts found"
                emptyDescription="Start by adding your first district"
            />

            {isAdmin && (
                <DistrictModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    editingDistrict={editingDistrict}
                    formData={formData}
                    onNameChange={(value) => setFormData({ ...formData, name: value })}
                    onBeachesChange={(value) => setFormData({ ...formData, beaches: value })}
                    onStreetsChange={(value) => setFormData({ ...formData, streets: value })}
                    onDeliveryPriceChange={(value) => setFormData({ ...formData, deliveryPrice: value })}
                />
            )}
        </div>
    );
}
