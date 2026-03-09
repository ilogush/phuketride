import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { useState } from "react";

export const meta: MetaFunction = () => [
    { title: "Hotels — Phuket Ride Admin" },
    { name: "description", content: "Manage hotels and accommodation in the Phuket Ride dictionary." },
    { name: "robots", content: "noindex, nofollow" },
];
import DataTable, { type Column } from '~/components/dashboard/data-table/DataTable';
import Button from '~/components/shared/ui/Button';
import PageHeader from '~/components/shared/ui/PageHeader';
import { PlusIcon } from "@heroicons/react/24/outline";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import type {
    AdminDistrictRow,
    AdminHotelRow,
    AdminLocationRow,
} from "~/lib/admin-dictionaries";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";

type Hotel = AdminHotelRow;
type Location = AdminLocationRow;
type District = Pick<AdminDistrictRow, "id" | "name" | "locationId">;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    return trackServerOperation({
        event: "hotels.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "hotels", search, page, pageSize },
        run: async () => {
            const [hotels, totalCount, locations, districts] = await Promise.all([
                sdb.hotels.list({ limit: pageSize, offset, search }) as Promise<Hotel[]>,
                sdb.hotels.count(search),
                sdb.locations.list() as Promise<Location[]>,
                sdb.districts.list() as Promise<District[]>,
            ]);

            return {
                hotels,
                totalCount,
                locations: locations.map(l => ({ id: l.id.toString(), name: l.name })),
                districts: districts.map(d => ({ id: d.id.toString(), name: d.name, locationId: d.locationId.toString() })),
                page,
                pageSize,
                search,
            };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, sdb } = await getScopedDb(request, context);
    const formData = await request.formData();
    const parsed = parseWithSchema(
        z.discriminatedUnion("intent", [
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

    if (parsed.data.intent === "delete") {
        const id = parsed.data.id;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("DELETE FROM hotels WHERE id = ?").bind(id).run();
            },
            feedback: {
                successPath: "/hotels",
                successMessage: "Hotel deleted successfully",
                errorMessage: "Failed to delete hotel",
            },
            audit: {
                entityType: "hotel",
                entityId: id,
                action: "delete",
            },
        });
    }

    if (parsed.data.intent === "create") {
        const { name, locationId, districtId, address } = parsed.data;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("INSERT INTO hotels (name, location_id, district_id, address) VALUES (?, ?, ?, ?)")
                    .bind(name, locationId, districtId, address || null)
                    .run();
            },
            feedback: {
                successPath: "/hotels",
                successMessage: "Hotel created successfully",
                errorMessage: "Failed to create hotel",
            },
            audit: {
                entityType: "hotel",
                action: "create",
                afterState: { name, locationId, districtId, address },
            },
        });
    }

    if (parsed.data.intent === "update") {
        const { id, name, locationId, districtId, address } = parsed.data;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("UPDATE hotels SET name = ?, location_id = ?, district_id = ?, address = ? WHERE id = ?")
                    .bind(name, locationId, districtId, address || null, id)
                    .run();
            },
            feedback: {
                successPath: "/hotels",
                successMessage: "Hotel updated successfully",
                errorMessage: "Failed to update hotel",
            },
            audit: {
                entityType: "hotel",
                entityId: id,
                action: "update",
                afterState: { name, locationId, districtId, address },
            },
        });
    }

    return redirectWithError("/hotels", "Invalid action");
}

export default function HotelsPage() {
    const { hotels, locations, districts, totalCount, search } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<string>("1");

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingHotel,
        setIsFormOpen: () => {}, // No longer used
        setEditingItem: setEditingHotel,
    });

    const columns: Column<Hotel>[] = [
        {
            key: "id",
            label: "ID",
            className: "w-16",
            render: (item) => String(item.id).padStart(3, "0")
        },
        {
            key: "name",
            label: "Hotel Name",
            render: (item) => (
                <span className="font-medium text-gray-900">{item.name}</span>
            ),
        },
        {
            key: "districtName",
            label: "District",
            render: (item) => (
                <span className="text-gray-700">{item.districtName || `Dist #${item.districtId}`}</span>
            ),
        },
        {
            key: "locationName",
            label: "Location",
            render: (item) => (
                <span className="text-gray-700">{item.locationName || `Loc #${item.locationId}`}</span>
            ),
        },
    ];

    // Filter districts by selected location for the form
    const filteredDistricts = districts.filter(d => String(d.locationId) === selectedLocationId);

    const fields: FieldConfig[] = [
        { name: "name", label: "Hotel Name", type: "text", required: true, placeholder: "e.g., Amanpuri" },
        { 
            name: "locationId", 
            label: "Location", 
            type: "select", 
            options: locations, 
            required: true,
            // We'll need to handle the change externally or update GenericDictionaryForm
        },
        { 
            name: "districtId", 
            label: "District", 
            type: "select", 
            options: filteredDistricts, 
            required: true 
        },
        { name: "address", label: "Address", type: "text", placeholder: "Full address" }
    ];

    const handleSearch = (val: string) => {
        const next = new URLSearchParams(searchParams);
        if (val) next.set("search", val);
        else next.delete("search");
        next.set("page", "1");
        setSearchParams(next, { replace: true });
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Hotels"
                rightActions={null}
            />
            
            <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                    <DataTable<Hotel>
                        columns={columns}
                        data={hotels}
                        totalCount={totalCount}
                        serverPagination={true}
                        isLoading={navigation.state === "loading"}
                        emptyTitle="No hotels found"
                        getRowClassName={() => "cursor-pointer"}
                        onRowClick={(item) => {
                            setEditingHotel(item);
                            setSelectedLocationId(String(item.locationId));
                        }}
                    />
                </div>

                <div className="w-full lg:w-80 shrink-0">
                    <GenericDictionaryForm
                        mode="sidebar"
                        title={editingHotel ? "Edit Hotel" : "Add Hotel"}
                        fields={[
                            ...fields.slice(0, 1),
                            {
                                ...fields[1],
                                transform: (val) => {
                                    setSelectedLocationId(val);
                                    return val;
                                }
                            },
                            ...fields.slice(2)
                        ]}
                        data={editingHotel ? {
                            name: editingHotel.name,
                            locationId: String(editingHotel.locationId),
                            districtId: String(editingHotel.districtId),
                            address: editingHotel.address
                        } : null}
                        onSubmit={handleFormSubmit}
                        onCancel={() => { setEditingHotel(null); }}
                        onDelete={editingHotel ? handleDelete : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
