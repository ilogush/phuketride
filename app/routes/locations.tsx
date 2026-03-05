import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import { useState } from "react";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import { Textarea } from "~/components/dashboard/Textarea";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { getEffectiveCompanyId } from "~/lib/mod-mode.server";
import Toggle from "~/components/dashboard/Toggle";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";

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
    const canManageCompanyDelivery = user.role === "partner" || isModMode;
    const canManageDistrictTemplates = user.role === "admin" && !isModMode;

    if (!canManageDistrictTemplates && !canManageCompanyDelivery) {
        return data({ success: false, message: "Forbidden" }, { status: 403 });
    }
    const formData = await request.formData();
    const intentParsed = parseWithSchema(
        z.enum(["bulkUpdate", "toggleStatus", "updatePrice", "delete", "update", "create"]),
        formData.get("intent"),
        "Invalid action"
    );
    if (!intentParsed.ok) {
        return data({ success: false, message: "Invalid action" }, { status: 400 });
    }
    const intent = intentParsed.data;
    const upsertCompanyDeliverySetting = async (districtId: number, isActive: boolean, deliveryPrice: number) => {
        if (!effectiveCompanyId) return;
        const now = new Date().toISOString();
        const updateResult = await context.cloudflare.env.DB
            .prepare(`
                UPDATE company_delivery_settings
                SET is_active = ?, delivery_price = ?, updated_at = ?
                WHERE company_id = ? AND district_id = ?
            `)
            .bind(isActive ? 1 : 0, deliveryPrice, now, effectiveCompanyId, districtId)
            .run() as { meta?: { changes?: number } };

        if ((updateResult.meta?.changes || 0) === 0) {
            await context.cloudflare.env.DB
                .prepare(`
                    INSERT INTO company_delivery_settings (company_id, district_id, is_active, delivery_price, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `)
                .bind(effectiveCompanyId, districtId, isActive ? 1 : 0, deliveryPrice, now, now)
                .run();
        }
    };

    if (intent === "bulkUpdate") {
        if (!canManageCompanyDelivery || !effectiveCompanyId) {
            return data({ success: false, message: "Forbidden" }, { status: 403 });
        }
        const updatesParsed = parseWithSchema(
            z.object({
                updates: z.string().min(2, "Updates payload is required"),
            }),
            {
                updates: formData.get("updates"),
            },
            "Invalid updates payload"
        );
        if (!updatesParsed.ok) {
            return data({ success: false, message: "Invalid updates payload" }, { status: 400 });
        }
        const updates = JSON.parse(updatesParsed.data.updates);

        // Partner/mod mode updates company-specific delivery settings by district id.
        for (const update of updates) {
            await upsertCompanyDeliverySetting(update.id, !!update.isActive, Number(update.deliveryPrice) || 0);
        }

        return data({ success: true, message: "All changes saved successfully" });
    }

    if (intent === "toggleStatus") {
        if (!canManageCompanyDelivery || !effectiveCompanyId) {
            return data({ success: false, message: "Forbidden" }, { status: 403 });
        }
        const toggleParsed = parseWithSchema(
            z.object({
                id: z.coerce.number().int().positive("District id is required"),
                isActive: z.enum(["true", "false"]),
                deliveryPrice: z.coerce.number().optional(),
            }),
            {
                id: formData.get("id"),
                isActive: formData.get("isActive"),
                deliveryPrice: formData.get("deliveryPrice"),
            },
            "Invalid toggle payload"
        );
        if (!toggleParsed.ok) {
            return data({ success: false, message: "Invalid toggle payload" }, { status: 400 });
        }
        const id = toggleParsed.data.id;
        const isActive = toggleParsed.data.isActive === "true";
        const currentPrice = toggleParsed.data.deliveryPrice;

        const fallbackPriceRow = await context.cloudflare.env.DB
            .prepare(`
                SELECT
                    cds.delivery_price AS company_delivery_price,
                    d.delivery_price AS district_delivery_price
                FROM districts d
                LEFT JOIN company_delivery_settings cds
                    ON cds.district_id = d.id AND cds.company_id = ?
                WHERE d.id = ?
                LIMIT 1
            `)
            .bind(effectiveCompanyId, id)
            .first() as { company_delivery_price?: number | null; district_delivery_price?: number | null } | null;
        const fallbackPrice = fallbackPriceRow?.company_delivery_price ?? fallbackPriceRow?.district_delivery_price ?? 0;
        const deliveryPrice =
            typeof currentPrice === "number" && Number.isFinite(currentPrice)
                ? currentPrice
                : Number(fallbackPrice);

        await upsertCompanyDeliverySetting(id, isActive, deliveryPrice);

        return data({ success: true, message: "Status updated successfully" });
    }

    if (intent === "updatePrice") {
        if (!canManageCompanyDelivery || !effectiveCompanyId) {
            return data({ success: false, message: "Forbidden" }, { status: 403 });
        }
        const priceParsed = parseWithSchema(
            z.object({
                id: z.coerce.number().int().positive("District id is required"),
                deliveryPrice: z.coerce.number(),
            }),
            {
                id: formData.get("id"),
                deliveryPrice: formData.get("deliveryPrice"),
            },
            "Invalid price payload"
        );
        if (!priceParsed.ok) {
            return data({ success: false, message: "Invalid price payload" }, { status: 400 });
        }
        const id = priceParsed.data.id;
        const deliveryPrice = priceParsed.data.deliveryPrice;
        const safeDeliveryPrice = Number.isFinite(deliveryPrice) ? deliveryPrice : 0;
        const districtResult = await context.cloudflare.env.DB
            .prepare(`
                SELECT is_active
                FROM company_delivery_settings
                WHERE company_id = ? AND district_id = ?
                LIMIT 1
            `)
            .bind(effectiveCompanyId, id)
            .first() as { is_active?: number } | null;
        const isActive = districtResult ? !!districtResult.is_active : true;

        await upsertCompanyDeliverySetting(id, isActive, safeDeliveryPrice);

        return data({ success: true, message: "Price updated successfully" });
    }

    if (intent === "delete") {
        if (!canManageDistrictTemplates) {
            return data({ success: false, message: "Forbidden" }, { status: 403 });
        }
        const deleteParsed = parseWithSchema(
            z.object({
                id: z.coerce.number().int().positive("District id is required"),
            }),
            {
                id: formData.get("id"),
            },
            "Invalid delete payload"
        );
        if (!deleteParsed.ok) {
            return data({ success: false, message: "Invalid delete payload" }, { status: 400 });
        }
        const id = deleteParsed.data.id;
        await context.cloudflare.env.DB.prepare("DELETE FROM districts WHERE id = ?").bind(id).run();
        return data({ success: true, message: "District deleted successfully" });
    }

    if (intent === "update") {
        if (!canManageDistrictTemplates) {
            return data({ success: false, message: "Forbidden" }, { status: 403 });
        }
        const updateParsed = parseWithSchema(
            z.object({
                id: z.coerce.number().int().positive("District id is required"),
                name: z.string().trim().min(1, "District name is required").max(200, "District name is too long"),
                beaches: z.string().trim().optional().nullable(),
                streets: z.string().trim().optional().nullable(),
                deliveryPrice: z.coerce.number().min(0, "Delivery price must be 0 or greater"),
            }),
            {
                id: formData.get("id"),
                name: formData.get("name"),
                beaches: formData.get("beaches"),
                streets: formData.get("streets"),
                deliveryPrice: formData.get("deliveryPrice"),
            },
            "Invalid update payload"
        );
        if (!updateParsed.ok) {
            return data({ success: false, message: updateParsed.error }, { status: 400 });
        }
        const { id, name, deliveryPrice } = updateParsed.data;
        const beaches = updateParsed.data.beaches || "";
        const streets = updateParsed.data.streets || "";

        const beachesArray = beaches.split(",").map(b => b.trim()).filter(b => b);
        const beachesJson = JSON.stringify(beachesArray);
        
        const streetsArray = streets.split(",").map(s => s.trim()).filter(s => s);
        const streetsJson = JSON.stringify(streetsArray);

        await context.cloudflare.env.DB
            .prepare(`
                UPDATE districts
                SET name = ?, beaches = ?, streets = ?, delivery_price = ?, updated_at = ?
                WHERE id = ?
            `)
            .bind(name, beachesJson, streetsJson, deliveryPrice, new Date().toISOString(), id)
            .run();

        return data({ success: true, message: "District updated successfully" });
    }

    if (intent === "create") {
        if (!canManageDistrictTemplates) {
            return data({ success: false, message: "Forbidden" }, { status: 403 });
        }
        const createParsed = parseWithSchema(
            z.object({
                name: z.string().trim().min(1, "District name is required").max(200, "District name is too long"),
                beaches: z.string().trim().optional().nullable(),
                streets: z.string().trim().optional().nullable(),
                deliveryPrice: z.coerce.number().min(0, "Delivery price must be 0 or greater"),
            }),
            {
                name: formData.get("name"),
                beaches: formData.get("beaches"),
                streets: formData.get("streets"),
                deliveryPrice: formData.get("deliveryPrice"),
            },
            "Invalid create payload"
        );
        if (!createParsed.ok) {
            return data({ success: false, message: createParsed.error }, { status: 400 });
        }
        const { name, deliveryPrice } = createParsed.data;
        const beaches = createParsed.data.beaches || "";
        const streets = createParsed.data.streets || "";

        const beachesArray = beaches.split(",").map(b => b.trim()).filter(b => b);
        const beachesJson = JSON.stringify(beachesArray);
        
        const streetsArray = streets.split(",").map(s => s.trim()).filter(s => s);
        const streetsJson = JSON.stringify(streetsArray);

        await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO districts (name, location_id, beaches, streets, delivery_price, created_at, updated_at)
                VALUES (?, 1, ?, ?, ?, ?, ?)
            `)
            .bind(name, beachesJson, streetsJson, deliveryPrice, new Date().toISOString(), new Date().toISOString())
            .run();

        return data({ success: true, message: "District created successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
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
                <Modal
                    title={editingDistrict ? "Edit District" : "Add"}
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    size="md"
                >
                    <Form method="post" className="space-y-4" onSubmit={handleCloseModal}>
                        <input type="hidden" name="intent" value={editingDistrict ? "update" : "create"} />
                        {editingDistrict && <input type="hidden" name="id" value={editingDistrict.id} />}

                        <Input
                            label="District Name"
                            name="name"
                            value={formData.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            placeholder="e.g., Patong"
                            required
                        />

                        <Textarea
                            label="Beaches / Locations (comma separated)"
                            name="beaches"
                            value={formData.beaches}
                            onChange={(value) => setFormData({ ...formData, beaches: value })}
                            rows={3}
                            placeholder="e.g., Patong Beach, Kalim Beach, Paradise Beach"
                            required
                        />

                        <Textarea
                            label="Streets / Roads (comma separated)"
                            name="streets"
                            value={formData.streets}
                            onChange={(value) => setFormData({ ...formData, streets: value })}
                            rows={3}
                            placeholder="e.g., Bangla Road, Beach Road, Rat-U-Thit Road"
                        />

                        <Input
                            label="Delivery Price (THB)"
                            name="deliveryPrice"
                            type="number"
                            value={formData.deliveryPrice}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData({ ...formData, deliveryPrice: e.target.value })
                            }
                            placeholder="e.g., 600"
                            required
                        />

                        <div className="flex justify-end gap-3 pt-4">
                            {editingDistrict && (
                                <Button type="submit" form="delete-district-form" variant="secondary">
                                    Delete
                                </Button>
                            )}
                            <Button type="submit" variant="primary">
                                {editingDistrict ? "Update" : "Create"}
                            </Button>
                        </div>
                    </Form>
                    {editingDistrict && (
                        <Form id="delete-district-form" method="post" className="hidden" onSubmit={handleCloseModal}>
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={editingDistrict.id} />
                        </Form>
                    )}
                </Modal>
            )}
        </div>
    );
}
