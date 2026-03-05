import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import AdminCrudModalPage from "~/components/dashboard/AdminCrudModalPage";
import { useUrlToast } from "~/lib/useUrlToast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { getRequestMetadata, quickAudit } from "~/lib/audit-logger";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { z } from "zod";
import { useCrudModal } from "~/lib/useCrudModal";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";
import { runMutationWithFeedback } from "~/lib/admin-actions";

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
    const [hotelsResult, locationsResult, districtsResult] = await Promise.all([
        context.cloudflare.env.DB
            .prepare(`SELECT id, name, location_id AS locationId, district_id AS districtId, address, created_at AS createdAt, updated_at AS updatedAt FROM hotels LIMIT ${QUERY_LIMITS.LARGE}`)
            .all(),
        context.cloudflare.env.DB
            .prepare(`SELECT id, name FROM locations LIMIT ${QUERY_LIMITS.LARGE}`)
            .all(),
        context.cloudflare.env.DB
            .prepare(`SELECT id, name, location_id AS locationId FROM districts LIMIT ${QUERY_LIMITS.LARGE}`)
            .all(),
    ]);

    const hotels = (hotelsResult.results ?? []) as Hotel[];
    const locations = (locationsResult.results ?? []) as Location[];
    const districts = (districtsResult.results ?? []) as District[];

    return { user, hotels, locations, districts };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const parsed = parseWithSchema(
        z
        .discriminatedUnion("intent", [
            z.object({
                intent: z.literal("delete"),
                id: z.coerce.number().int().positive("Hotel id is required"),
            }),
            z.object({
                intent: z.literal("create"),
                name: z.string().trim().min(1, "Hotel name is required").max(200, "Hotel name is too long"),
                locationId: z.coerce.number().int().positive("Location is required"),
                districtId: z.coerce.number().int().positive("District is required"),
                address: z.string().trim().max(500, "Address is too long").optional().nullable(),
            }),
            z.object({
                intent: z.literal("update"),
                id: z.coerce.number().int().positive("Hotel id is required"),
                name: z.string().trim().min(1, "Hotel name is required").max(200, "Hotel name is too long"),
                locationId: z.coerce.number().int().positive("Location is required"),
                districtId: z.coerce.number().int().positive("District is required"),
                address: z.string().trim().max(500, "Address is too long").optional().nullable(),
            }),
        ]),
        {
            intent: formData.get("intent"),
            id: formData.get("id"),
            name: formData.get("name"),
            locationId: formData.get("locationId"),
            districtId: formData.get("districtId"),
            address: formData.get("address"),
        },
        "Invalid action payload"
    );
    if (!parsed.ok) {
        return redirectWithError("/hotels", parsed.error);
    }
    const metadata = getRequestMetadata(request);

    if (parsed.data.intent === "delete") {
        const id = parsed.data.id;
        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare("DELETE FROM hotels WHERE id = ?")
                    .bind(id)
                    .run();
                quickAudit({
                    db: context.cloudflare.env.DB,
                    userId: user.id,
                    role: user.role,
                    companyId: user.companyId,
                    entityType: "hotel",
                    entityId: id,
                    action: "delete",
                    ...metadata,
                });
            },
            {
                successPath: "/hotels",
                successMessage: "Hotel deleted successfully",
                errorMessage: "Failed to delete hotel",
            }
        );
    }

    if (parsed.data.intent === "create") {
        const { name, locationId, districtId } = parsed.data;
        const address = parsed.data.address || null;

        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare("INSERT INTO hotels (name, location_id, district_id, address) VALUES (?, ?, ?, ?)")
                    .bind(name, locationId, districtId, address || null)
                    .run();
                quickAudit({
                    db: context.cloudflare.env.DB,
                    userId: user.id,
                    role: user.role,
                    companyId: user.companyId,
                    entityType: "hotel",
                    action: "create",
                    afterState: { name, locationId, districtId, address: address || null },
                    ...metadata,
                });
            },
            {
                successPath: "/hotels",
                successMessage: "Hotel created successfully",
                errorMessage: "Failed to create hotel",
            }
        );
    }

    if (parsed.data.intent === "update") {
        const { id, name, locationId, districtId } = parsed.data;
        const address = parsed.data.address || null;

        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare("UPDATE hotels SET name = ?, location_id = ?, district_id = ?, address = ? WHERE id = ?")
                    .bind(name, locationId, districtId, address || null, id)
                    .run();
                quickAudit({
                    db: context.cloudflare.env.DB,
                    userId: user.id,
                    role: user.role,
                    companyId: user.companyId,
                    entityType: "hotel",
                    entityId: id,
                    action: "update",
                    afterState: { name, locationId, districtId, address: address || null },
                    ...metadata,
                });
            },
            {
                successPath: "/hotels",
                successMessage: "Hotel updated successfully",
                errorMessage: "Failed to update hotel",
            }
        );
    }

    return redirectWithError("/hotels", "Invalid action");
}

export default function HotelsPage() {
    const { hotels, locations, districts } = useLoaderData<typeof loader>();
    useUrlToast();
    const { validateLatinInput } = useLatinValidation();
    const {
        isModalOpen,
        editingEntity: editingHotel,
        formData,
        setFormData,
        openCreateModal,
        openEditModal,
        closeModal,
    } = useCrudModal<Hotel, { name: string; locationId: string; districtId: string; address: string }>({
        initialFormData: {
            name: "",
            locationId: "1",
            districtId: "1",
            address: "",
        },
        mapEntityToFormData: (hotel) => ({
            name: hotel.name,
            locationId: String(hotel.locationId),
            districtId: String(hotel.districtId),
            address: hotel.address || "",
        }),
    });

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
                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold font-mono bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
                    {String(item.id).padStart(3, "0")}
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
            title="Hotels"
            addLabel="Add"
            onAdd={openCreateModal}
            tableContent={
                <DataTable
                    columns={columns}
                    data={hotels}
                    disablePagination={true}
                    emptyTitle="No hotels configured"
                    emptyDescription="Add hotels to get started"
                />
            }
            modalTitle={editingHotel ? "Edit Hotel" : "Add Hotel"}
            isModalOpen={isModalOpen}
            onCloseModal={closeModal}
            formIntent={editingHotel ? "update" : "create"}
            editingId={editingHotel?.id}
            onFormSubmit={closeModal}
            submitLabel={editingHotel ? "Update Hotel" : "Create Hotel"}
            formChildren={
                <>
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
                </>
            }
        />
    );
}
