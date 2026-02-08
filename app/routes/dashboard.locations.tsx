import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import DataTable, { type Column } from "~/components/ui/DataTable";
import { useState } from "react";
import Modal from "~/components/ui/Modal";
import { Input } from "~/components/ui/Input";
import { PlusIcon } from "@heroicons/react/24/outline";

interface District {
    id: number;
    name: string;
    locationId: number;
    beaches: string | null;
    streets: string | null;
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

    const isAdmin = user.role === "admin";

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
            render: (item) => <span className="font-semibold">{item.name}</span>,
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
        },
        ...(isAdmin
            ? [
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
            : [
                {
                    key: "deliveryPrice",
                    label: "Delivery Price",
                    render: (item: District) => (
                        <span className="font-medium">฿{item.deliveryPrice || 0}</span>
                    ),
                    className: "text-right",
                },
            ]),
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Districts & Locations (Phuket)"
                rightActions={
                    isAdmin ? (
                        <Button variant="primary" icon={<PlusIcon className="w-5 h-5" />} onClick={() => setIsModalOpen(true)}>
                            Add
                        </Button>
                    ) : undefined
                }
            />

            <DataTable
                data={districts}
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

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">
                                Beaches / Locations (comma separated)
                            </label>
                            <textarea
                                name="beaches"
                                value={formData.beaches}
                                onChange={(e) => setFormData({ ...formData, beaches: e.target.value })}
                                className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                                rows={3}
                                placeholder="e.g., Patong Beach, Kalim Beach, Paradise Beach"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs text-gray-600 mb-1">
                                Streets / Roads (comma separated)
                            </label>
                            <textarea
                                name="streets"
                                value={formData.streets}
                                onChange={(e) => setFormData({ ...formData, streets: e.target.value })}
                                className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                                rows={3}
                                placeholder="e.g., Bangla Road, Beach Road, Rat-U-Thit Road"
                            />
                        </div>

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
