import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/dashboard/PageHeader";
import Button from "~/components/dashboard/Button";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import { useState } from "react";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import { Textarea } from "~/components/dashboard/Textarea";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";

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

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const districts = await db.select().from(schema.districts).where(eq(schema.districts.locationId, 1)).limit(100);

    return { districts, user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "bulkUpdate") {
        const updates = JSON.parse(formData.get("updates") as string);
        
        for (const update of updates) {
            await db.update(schema.districts)
                .set({ 
                    isActive: update.isActive,
                    deliveryPrice: update.deliveryPrice,
                    updatedAt: new Date() 
                })
                .where(eq(schema.districts.id, update.id));
        }

        return data({ success: true, message: "All changes saved successfully" });
    }

    if (intent === "toggleStatus") {
        const id = Number(formData.get("id"));
        const isActive = formData.get("isActive") === "true";
        
        await db.update(schema.districts)
            .set({ isActive, updatedAt: new Date() })
            .where(eq(schema.districts.id, id));

        return data({ success: true, message: "Status updated successfully" });
    }

    if (intent === "updatePrice") {
        const id = Number(formData.get("id"));
        const deliveryPrice = Number(formData.get("deliveryPrice"));
        
        await db.update(schema.districts)
            .set({ deliveryPrice, updatedAt: new Date() })
            .where(eq(schema.districts.id, id));

        return data({ success: true, message: "Price updated successfully" });
    }

    if (intent === "delete") {
        const id = Number(formData.get("id"));
        await db.delete(schema.districts).where(eq(schema.districts.id, id));
        return data({ success: true, message: "District deleted successfully" });
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const name = formData.get("name") as string;
        const beaches = formData.get("beaches") as string;
        const streets = formData.get("streets") as string;
        const deliveryPrice = Number(formData.get("deliveryPrice"));

        const beachesArray = beaches.split(",").map(b => b.trim()).filter(b => b);
        const beachesJson = JSON.stringify(beachesArray);
        
        const streetsArray = streets.split(",").map(s => s.trim()).filter(s => s);
        const streetsJson = JSON.stringify(streetsArray);

        await db.update(schema.districts)
            .set({ name, beaches: beachesJson, streets: streetsJson, deliveryPrice })
            .where(eq(schema.districts.id, id));

        return data({ success: true, message: "District updated successfully" });
    }

    if (intent === "create") {
        const name = formData.get("name") as string;
        const beaches = formData.get("beaches") as string;
        const streets = formData.get("streets") as string;
        const deliveryPrice = Number(formData.get("deliveryPrice"));

        const beachesArray = beaches.split(",").map(b => b.trim()).filter(b => b);
        const beachesJson = JSON.stringify(beachesArray);
        
        const streetsArray = streets.split(",").map(s => s.trim()).filter(s => s);
        const streetsJson = JSON.stringify(streetsArray);

        await db.insert(schema.districts).values({
            name,
            locationId: 1,
            beaches: beachesJson,
            streets: streetsJson,
            deliveryPrice
        });

        return data({ success: true, message: "District created successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function LocationsPage() {
    const { districts, user } = useLoaderData<typeof loader>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [formData, setFormData] = useState({ name: "", beaches: "", streets: "", deliveryPrice: "0" });
    const [localDistricts, setLocalDistricts] = useState(districts);
    const toast = useToast();

    const isAdmin = user.role === "admin";
    const isPartner = user.role === "partner";

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
            toast.success(
                `${district.name} ${newStatus ? 'activated' : 'deactivated'}`,
                { duration: 3000 }
            );
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
                return <span className="text-xs text-gray-400">{beaches.join(", ")}</span>;
            },
        },
        ...(isPartner
            ? [
                {
                    key: "status",
                    label: "Status",
                    render: (item: District) => {
                        const district = localDistricts.find(d => d.id === item.id) || item;
                        return (
                            <button
                                type="button"
                                onClick={() => handleToggleStatus(item.id, district.isActive)}
                                className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${
                                    district.isActive ? "bg-gray-900 border-transparent" : "bg-gray-200 border-transparent"
                                }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                        district.isActive ? "translate-x-4" : "translate-x-0"
                                    }`}
                                />
                            </button>
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
                                    className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-xs placeholder:text-gray-500 read-only:bg-gray-100 read-only:text-gray-500 read-only:cursor-not-allowed read-only:border-gray-200 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed disabled:border-gray-200"
                                />
                                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">
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
                    key: "streets",
                    label: "Streets / Roads",
                    render: (item: District) => {
                        const streets = parseStreets(item.streets);
                        return <span className="text-sm">{streets.join(", ")}</span>;
                    },
                    wrap: true,
                },
                {
                    key: "actions",
                    label: "Actions",
                    render: (item: District) => (
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleEdit(item)}
                            >
                                Edit
                            </Button>
                            <Form method="post" className="inline">
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="id" value={item.id} />
                                <Button type="submit" variant="secondary" size="sm">
                                    Delete
                                </Button>
                            </Form>
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
                    isAdmin ? (
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
                            Add
                        </Button>
                    ) : isPartner ? (
                        <Button variant="primary" onClick={handleSaveAll}>
                            Save
                        </Button>
                    ) : undefined
                }
            />

            {isPartner && (
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
            )}

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
                            <Button type="button" variant="secondary" onClick={handleCloseModal}>
                                Cancel
                            </Button>
                            <Button type="submit" variant="primary">
                                {editingDistrict ? "Update District" : "Create District"}
                            </Button>
                        </div>
                    </Form>
                </Modal>
            )}
        </div>
    );
}
