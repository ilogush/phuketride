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

interface Hotel {
    id: number;
    name: string;
    locationId: number;
    districtId: number;
    address: string | null;
    createdAt: Date;
    updatedAt: Date;
}

interface Location {
    id: number;
    name: string;
}

interface District {
    id: number;
    name: string;
    locationId: number;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const [hotels, locations, districts] = await Promise.all([
        db.select().from(schema.hotels).limit(100),
        db.select().from(schema.locations).limit(100),
        db.select().from(schema.districts).limit(100),
    ]);

    return { user, hotels, locations, districts };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const id = Number(formData.get("id"));
        await db.delete(schema.hotels).where(eq(schema.hotels.id, id));
        return data({ success: true, message: "Hotel deleted successfully" });
    }

    if (intent === "create") {
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const districtId = Number(formData.get("districtId"));
        const address = formData.get("address") as string | null;

        await db.insert(schema.hotels).values({
            name,
            locationId,
            districtId,
            address: address || null,
        });

        return data({ success: true, message: "Hotel created successfully" });
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const districtId = Number(formData.get("districtId"));
        const address = formData.get("address") as string | null;

        await db
            .update(schema.hotels)
            .set({ name, locationId, districtId, address: address || null })
            .where(eq(schema.hotels.id, id));

        return data({ success: true, message: "Hotel updated successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function HotelsPage() {
    const { hotels, locations, districts } = useLoaderData<typeof loader>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        locationId: "1",
        districtId: "1",
        address: "",
    });

    const handleEdit = (hotel: Hotel) => {
        setEditingHotel(hotel);
        setFormData({
            name: hotel.name,
            locationId: String(hotel.locationId),
            districtId: String(hotel.districtId),
            address: hotel.address || "",
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingHotel(null);
        setFormData({ name: "", locationId: "1", districtId: "1", address: "" });
    };

    const getLocationName = (locationId: number) => {
        return locations.find((l) => l.id === locationId)?.name || "-";
    };

    const getDistrictName = (districtId: number) => {
        return districts.find((d) => d.id === districtId)?.name || "-";
    };

    const filteredDistricts = districts.filter(
        (d) => d.locationId === Number(formData.locationId)
    );

    const columns: Column<Hotel>[] = [
        {
            key: "id",
            label: "ID",
            render: (item) => (
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-full">
                    {String(item.id).padStart(4, "0")}
                </span>
            ),
        },
        {
            key: "name",
            label: "Hotel Name",
            render: (item) => (
                <span className="font-medium text-gray-900">{item.name}</span>
            ),
        },
        {
            key: "location",
            label: "Location",
            render: (item) => (
                <span className="text-gray-700">{getLocationName(item.locationId)}</span>
            ),
        },
        {
            key: "district",
            label: "District",
            render: (item) => (
                <span className="text-gray-700">{getDistrictName(item.districtId)}</span>
            ),
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
                title="Hotels"
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
                data={hotels}
                disablePagination={true}
                emptyTitle="No hotels configured"
                emptyDescription="Add hotels to get started"
            />

            <Modal
                title={editingHotel ? "Edit Hotel" : "Add Hotel"}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                size="md"
            >
                <Form method="post" className="space-y-4" onSubmit={handleCloseModal}>
                    <input type="hidden" name="intent" value={editingHotel ? "update" : "create"} />
                    {editingHotel && <input type="hidden" name="id" value={editingHotel.id} />}

                    <Input
                        label="Hotel Name"
                        name="name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="e.g., Amanpuri"
                        required
                    />

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">
                            Location
                        </label>
                        <select
                            name="locationId"
                            value={formData.locationId}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    locationId: e.target.value,
                                    districtId: filteredDistricts[0]?.id.toString() || "1",
                                })
                            }
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

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">
                            District
                        </label>
                        <select
                            name="districtId"
                            value={formData.districtId}
                            onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        >
                            {filteredDistricts.map((district) => (
                                <option key={district.id} value={district.id}>
                                    {district.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <Input
                        label="Address (Optional)"
                        name="address"
                        value={formData.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setFormData({ ...formData, address: e.target.value })
                        }
                        placeholder="Hotel address"
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="secondary" onClick={handleCloseModal}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingHotel ? "Update Hotel" : "Create Hotel"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}
