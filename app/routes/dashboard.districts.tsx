import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { useState } from "react";
import DataTable, { type Column } from "~/components/ui/DataTable";
import Button from "~/components/ui/Button";
import Modal from "~/components/ui/Modal";
import { Input } from "~/components/ui/Input";
import PageHeader from "~/components/ui/PageHeader";
import { PlusIcon } from "@heroicons/react/24/outline";

interface District {
    id: number;
    name: string;
    locationId: number;
    deliveryPrice: number | null;
    createdAt: Date;
    updatedAt: Date;
}

const DISTRICT_BEACHES: Record<string, string> = {
    "Airport": "Phuket Airport, Thepkrasattri Rd, Heroines Monument, Mai Khao area, Nai Yang area",
    "Bang Tao": "Bang Tao Beach, Layan Beach",
    "Chalong": "Chalong Bay, Cape Panwa Beach, Khao Khad Beach",
    "Kamala": "Kamala Beach",
    "Karon": "Karon Beach, Karon Noi Beach",
    "Kata": "Kata Beach, Kata Noi Beach",
    "Kathu": "Central Festival, Phang Muang Sai Kor Rd, Loch Palm Golf, Patong Hill",
    "Mai Khao": "Mai Khao Beach, Sai Kaew Beach",
    "Nai Harn": "Nai Harn Beach",
    "Nai Thon": "Nai Thon Beach, Banana Beach",
    "Nai Yang": "Nai Yang Beach",
    "Patong": "Patong Beach, Kalim Beach, Paradise Beach",
    "Phuket Town": "Phuket Old Town, Thalang Rd, Yaowarat Rd, Boat Lagoon, Koh Kaew",
    "Rawai": "Rawai Beach, Friendship Beach, Yanui Beach",
    "Surin": "Surin Beach, Pansea Beach",
};

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [districts, locations] = await Promise.all([
        db.select().from(schema.districts).limit(100),
        db.select().from(schema.locations).limit(100),
    ]);

    return { user, districts, locations };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const id = Number(formData.get("id"));
        await db.delete(schema.districts).where(eq(schema.districts.id, id));
        return data({ success: true, message: "District deleted successfully" });
    }

    if (intent === "create") {
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const deliveryPrice = Number(formData.get("deliveryPrice"));

        await db.insert(schema.districts).values({
            name,
            locationId,
            deliveryPrice,
        });

        return data({ success: true, message: "District created successfully" });
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const deliveryPrice = Number(formData.get("deliveryPrice"));

        await db
            .update(schema.districts)
            .set({ name, locationId, deliveryPrice })
            .where(eq(schema.districts.id, id));

        return data({ success: true, message: "District updated successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function DistrictsPage() {
    const { districts, locations } = useLoaderData<typeof loader>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        locationId: "1",
        deliveryPrice: "500",
    });

    const handleEdit = (district: District) => {
        setEditingDistrict(district);
        setFormData({
            name: district.name,
            locationId: String(district.locationId),
            deliveryPrice: String(district.deliveryPrice),
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDistrict(null);
        setFormData({ name: "", locationId: "1", deliveryPrice: "500" });
    };

    const columns: Column<District>[] = [
        {
            key: "name",
            label: "District",
            render: (item) => (
                <span className="font-medium text-gray-900">{item.name}</span>
            ),
        },
        {
            key: "beaches",
            label: "Beaches / Locations",
            render: (item) => (
                <span className="text-sm text-gray-500">
                    {DISTRICT_BEACHES[item.name] || "-"}
                </span>
            ),
            wrap: true,
        },
        {
            key: "actions",
            label: "Actions",
            render: (item) => (
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
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="Districts"
                rightActions={
                    <Button
                        variant="primary"
                        icon={<PlusIcon className="w-5 h-5" />}
                        onClick={() => setIsModalOpen(true)}
                    >
                        Add
                    </Button>
                }
            />

            <DataTable
                columns={columns}
                data={districts}
                disablePagination={true}
                emptyTitle="No districts configured"
                emptyDescription="Adds to get started"
            />

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
                            Location
                        </label>
                        <select
                            name="locationId"
                            value={formData.locationId}
                            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            {locations.map((location) => (
                                <option key={location.id} value={location.id}>
                                    {location.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Delivery Price (THB)"
                        name="deliveryPrice"
                        type="number"
                        value={formData.deliveryPrice}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, deliveryPrice: e.target.value })
                        }
                        placeholder="500"
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
        </div>
    );
}
