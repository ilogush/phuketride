import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { useState, useEffect } from "react";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useLatinValidation } from "~/lib/useLatinValidation";

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
        try {
            await db.delete(schema.hotels).where(eq(schema.hotels.id, id));
            return redirect("/hotels?success=Hotel deleted successfully");
        } catch (error) {
            console.error("Failed to delete hotel:", error);
            return redirect("/hotels?error=Failed to delete hotel");
        }
    }

    if (intent === "create") {
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const districtId = Number(formData.get("districtId"));
        const address = formData.get("address") as string | null;

        try {
            await db.insert(schema.hotels).values({
                name,
                locationId,
                districtId,
                address: address || null,
            });
            return redirect("/hotels?success=Hotel created successfully");
        } catch (error) {
            console.error("Failed to create hotel:", error);
            return redirect("/hotels?error=Failed to create hotel");
        }
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const districtId = Number(formData.get("districtId"));
        const address = formData.get("address") as string | null;

        try {
            await db
                .update(schema.hotels)
                .set({ name, locationId, districtId, address: address || null })
                .where(eq(schema.hotels.id, id));
            return redirect("/hotels?success=Hotel updated successfully");
        } catch (error) {
            console.error("Failed to update hotel:", error);
            return redirect("/hotels?error=Failed to update hotel");
        }
    }

    return redirect("/hotels?error=Invalid action");
}

export default function HotelsPage() {
    const { hotels, locations, districts } = useLoaderData<typeof loader>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const { validateLatinInput } = useLatinValidation();
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
            key: "district",
            label: "District",
            render: (item) => (
                <span className="text-gray-700">{getDistrictName(item.districtId)}</span>
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
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setFormData({ ...formData, name: e.target.value });
                            validateLatinInput(e, 'Hotel Name');
                        }}
                        placeholder="e.g., Amanpuri"
                        required
                    />

                    <Select
                        label="Location"
                        name="locationId"
                        value={formData.locationId}
                        onChange={(e) =>
                            setFormData({
                                ...formData,
                                locationId: e.target.value,
                                districtId: filteredDistricts[0]?.id.toString() || "1",
                            })
                        }
                        options={locations}
                        required
                    />

                    <Select
                        label="District"
                        name="districtId"
                        value={formData.districtId}
                        onChange={(e) => setFormData({ ...formData, districtId: e.target.value })}
                        options={filteredDistricts}
                        required
                    />

                    <Input
                        label="Address (Optional)"
                        name="address"
                        value={formData.address}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            setFormData({ ...formData, address: e.target.value });
                            validateLatinInput(e, 'Address');
                        }}
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
