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

interface District {
    id: number;
    name: string;
    locationId: number;
    beaches: string | null;
    deliveryPrice: number | null;
    createdAt: Date;
    updatedAt: Date;
}

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
        try {
            await db.delete(schema.districts).where(eq(schema.districts.id, id));
            return redirect("/districts?success=District deleted successfully");
        } catch (error) {
            console.error("Failed to delete district:", error);
            return redirect("/districts?error=Failed to delete district");
        }
    }

    if (intent === "create") {
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const deliveryPrice = Number(formData.get("deliveryPrice"));

        try {
            await db.insert(schema.districts).values({
                name,
                locationId,
                deliveryPrice,
            });
            return redirect("/districts?success=District created successfully");
        } catch (error) {
            console.error("Failed to create district:", error);
            return redirect("/districts?error=Failed to create district");
        }
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const name = formData.get("name") as string;
        const locationId = Number(formData.get("locationId"));
        const deliveryPrice = Number(formData.get("deliveryPrice"));

        try {
            await db
                .update(schema.districts)
                .set({ name, locationId, deliveryPrice })
                .where(eq(schema.districts.id, id));
            return redirect("/districts?success=District updated successfully");
        } catch (error) {
            console.error("Failed to update district:", error);
            return redirect("/districts?error=Failed to update district");
        }
    }

    return redirect("/districts?error=Invalid action");
}

export default function DistrictsPage() {
    const { districts, locations } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        locationId: "1",
        deliveryPrice: "500",
    });

    // Toast notifications
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        if (success) {
            toast.success(success);
        }
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

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
            render: (item) => {
                let beachesText = "-";
                if (item.beaches) {
                    try {
                        const beachesArray = JSON.parse(item.beaches);
                        beachesText = beachesArray.join(", ");
                    } catch {
                        beachesText = item.beaches;
                    }
                }
                return (
                    <span className="text-sm text-gray-500">
                        {beachesText}
                    </span>
                );
            },
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

                    <Select
                        label="Location"
                        name="locationId"
                        value={formData.locationId}
                        onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                        options={locations}
                        required
                    />

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
