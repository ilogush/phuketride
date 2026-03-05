import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import AdminCrudModalPage from "~/components/dashboard/AdminCrudModalPage";
import { useUrlToast } from "~/lib/useUrlToast";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { districtActionSchema } from "~/schemas/dictionary";
import { useCrudModal } from "~/lib/useCrudModal";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";
import { runMutationWithFeedback } from "~/lib/admin-actions";

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
    const [districtsResult, locationsResult] = await Promise.all([
        context.cloudflare.env.DB
            .prepare(`SELECT id, name, location_id AS locationId, beaches, delivery_price AS deliveryPrice, created_at AS createdAt, updated_at AS updatedAt FROM districts LIMIT ${QUERY_LIMITS.LARGE}`)
            .all(),
        context.cloudflare.env.DB
            .prepare(`SELECT id, name FROM locations LIMIT ${QUERY_LIMITS.LARGE}`)
            .all(),
    ]);
    const districts = (districtsResult.results ?? []) as District[];
    const locations = (locationsResult.results ?? []) as Array<{ id: number; name: string }>;

    return { user, districts, locations };
}

export async function action({ request, context }: ActionFunctionArgs) {
    await requireAuth(request);
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

    if (parsed.data.intent === "delete") {
        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare("DELETE FROM districts WHERE id = ?")
                    .bind(parsed.data.id)
                    .run();
            },
            {
                successPath: "/districts",
                successMessage: "District deleted successfully",
                errorMessage: "Failed to delete district",
            }
        );
    }

    if (parsed.data.intent === "create") {
        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare("INSERT INTO districts (name, location_id, delivery_price) VALUES (?, ?, ?)")
                    .bind(parsed.data.name, parsed.data.locationId, parsed.data.deliveryPrice)
                    .run();
            },
            {
                successPath: "/districts",
                successMessage: "District created successfully",
                errorMessage: "Failed to create district",
            }
        );
    }

    if (parsed.data.intent === "update") {
        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare("UPDATE districts SET name = ?, location_id = ?, delivery_price = ? WHERE id = ?")
                    .bind(parsed.data.name, parsed.data.locationId, parsed.data.deliveryPrice, parsed.data.id)
                    .run();
            },
            {
                successPath: "/districts",
                successMessage: "District updated successfully",
                errorMessage: "Failed to update district",
            }
        );
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
