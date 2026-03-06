import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import AdminCrudModalPage from "~/components/dashboard/AdminCrudModalPage";
import { useUrlToast } from "~/lib/useUrlToast";
import { districtActionSchema } from "~/schemas/dictionary";
import { useCrudModal } from "~/lib/useCrudModal";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { loadAdminPageData, runAdminMutationAction } from "~/lib/admin-crud.server";
import {
    loadAdminDistricts,
    loadAdminLocations,
    type AdminDistrictRow,
    type AdminLocationRow,
} from "~/lib/admin-dictionaries.server";

type District = Required<Pick<AdminDistrictRow, "id" | "name" | "locationId" | "beaches" | "deliveryPrice" | "createdAt" | "updatedAt">>;

export async function loader({ request, context }: LoaderFunctionArgs) {
    await requireAdmin(request);
    return loadAdminPageData({
        request,
        context,
        loaders: {
            districts: (db) => loadAdminDistricts(db, { includeDetails: true }) as Promise<District[]>,
            locations: loadAdminLocations as (db: D1Database) => Promise<AdminLocationRow[]>,
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const parsed = parseWithSchema(
        districtActionSchema,
        {
            intent: formData.get("intent"),
            id: formData.get("id"),
            name: formData.get("name"),
            locationId: formData.get("locationId"),
            deliveryPrice: formData.get("deliveryPrice"),
        },
        "Invalid request data"
    );

    if (!parsed.ok) {
        return redirectWithError("/districts", parsed.error);
    }
    const data = parsed.data;

    if (data.intent === "delete") {
        const { id } = data;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("DELETE FROM districts WHERE id = ?").bind(id).run();
            },
            feedback: {
                successPath: "/districts",
                successMessage: "District deleted successfully",
                errorMessage: "Failed to delete district",
            },
            audit: {
                entityType: "district",
                entityId: id,
                action: "delete",
            },
        });
    }

    if (data.intent === "create") {
        const { name, locationId, deliveryPrice } = data;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("INSERT INTO districts (name, location_id, delivery_price) VALUES (?, ?, ?)")
                    .bind(name, locationId, deliveryPrice)
                    .run();
            },
            feedback: {
                successPath: "/districts",
                successMessage: "District created successfully",
                errorMessage: "Failed to create district",
            },
            audit: {
                entityType: "district",
                action: "create",
                afterState: { name, locationId, deliveryPrice },
            },
        });
    }

    if (data.intent === "update") {
        const { id, name, locationId, deliveryPrice } = data;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("UPDATE districts SET name = ?, location_id = ?, delivery_price = ? WHERE id = ?")
                    .bind(name, locationId, deliveryPrice, id)
                    .run();
            },
            feedback: {
                successPath: "/districts",
                successMessage: "District updated successfully",
                errorMessage: "Failed to update district",
            },
            audit: {
                entityType: "district",
                entityId: id,
                action: "update",
                afterState: { name, locationId, deliveryPrice },
            },
        });
    }

    return redirectWithError("/districts", "Invalid action");
}

export default function DistrictsPage() {
    const { districts, locations } = useLoaderData<typeof loader>();
    useUrlToast();
    const {
        isModalOpen,
        editingEntity: editingDistrict,
        formData,
        setFormData,
        openCreateModal,
        openEditModal,
        closeModal,
    } = useCrudModal<District, { name: string; locationId: string; deliveryPrice: string }>({
        initialFormData: {
            name: "",
            locationId: "1",
            deliveryPrice: "500",
        },
        mapEntityToFormData: (district) => ({
            name: district.name,
            locationId: String(district.locationId),
            deliveryPrice: String(district.deliveryPrice),
        }),
    });

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
                        onClick={() => openEditModal(item)}
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
        <AdminCrudModalPage
            title="Districts"
            addLabel="Add"
            onAdd={openCreateModal}
            tableContent={
                <DataTable
                    columns={columns}
                    data={districts}
                    disablePagination={true}
                    emptyTitle="No districts configured"
                    emptyDescription="Adds to get started"
                />
            }
            modalTitle={editingDistrict ? "Edit District" : "Add"}
            isModalOpen={isModalOpen}
            onCloseModal={closeModal}
            formIntent={editingDistrict ? "update" : "create"}
            editingId={editingDistrict?.id}
            onFormSubmit={closeModal}
            submitLabel={editingDistrict ? "Update District" : "Create District"}
            formChildren={
                <>
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
                </>
            }
        />
    );
}
