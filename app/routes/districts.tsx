import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useSubmit, useNavigation, useSearchParams } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Districts — Phuket Ride Admin" },
    { name: "description", content: "Manage districts and delivery zones in the Phuket Ride dictionary." },
    { name: "robots", content: "noindex, nofollow" },
];
import { useState } from "react";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { districtActionSchema } from "~/schemas/dictionary";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import {
    loadAdminDistricts,
    loadAdminLocations,
    countAdminDistricts,
    type AdminDistrictRow,
    type AdminLocationRow,
} from "~/lib/admin-dictionaries.server";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";

type District = Required<Pick<AdminDistrictRow, "id" | "name" | "locationId" | "beaches" | "deliveryPrice" | "createdAt" | "updatedAt">> & { locationName?: string };

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "20");
    const offset = (page - 1) * pageSize;

    return trackServerOperation({
        event: "districts.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "districts", search, page, pageSize },
        run: async () => {
            const [districts, totalCount, locations] = await Promise.all([
                loadAdminDistricts(sdb.db as any, { 
                    includeDetails: true, 
                    limit: pageSize, 
                    offset, 
                    search 
                }) as Promise<District[]>,
                countAdminDistricts(sdb.db as any, search),
                loadAdminLocations(sdb.db as any) as Promise<AdminLocationRow[]>,
            ]);

            return {
                districts,
                totalCount,
                locations: locations.map(l => ({ id: l.id.toString(), name: l.name })),
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
    const intent = formData.get("intent");
    
    const parsed = parseWithSchema(
        districtActionSchema,
        {
            intent,
            id: formData.get("id"),
            name: formData.get("name"),
            locationId: formData.get("locationId"),
            deliveryPrice: formData.get("deliveryPrice"),
            beaches: formData.get("beaches"),
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
        const { name, locationId, deliveryPrice, beaches } = data;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("INSERT INTO districts (name, location_id, delivery_price, beaches) VALUES (?, ?, ?, ?)")
                    .bind(name, locationId, deliveryPrice, beaches || null)
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
                afterState: { name, locationId, deliveryPrice, beaches },
            },
        });
    }

    if (data.intent === "update") {
        const { id, name, locationId, deliveryPrice, beaches } = data;
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("UPDATE districts SET name = ?, location_id = ?, delivery_price = ?, beaches = ? WHERE id = ?")
                    .bind(name, locationId, deliveryPrice, beaches || null, id)
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
                afterState: { name, locationId, deliveryPrice, beaches },
            },
        });
    }

    return redirectWithError("/districts", "Invalid action");
}

export default function DistrictsPage() {
    const { districts, locations, totalCount, search } = useLoaderData<typeof loader>();
    useUrlToast();
    const submit = useSubmit();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingDistrict, setEditingDistrict] = useState<District | null>(null);

    const columns: Column<District>[] = [
        {
            key: "id",
            label: "ID",
            className: "w-16"
        },
        {
            key: "name",
            label: "District",
            render: (item) => (
                <span className="font-medium text-gray-900">{item.name}</span>
            ),
        },
        {
            key: "locationName",
            label: "Location",
            render: (item) => (
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {item.locationName || `Loc #${item.locationId}`}
                </span>
            )
        },
        {
            key: "deliveryPrice",
            label: "Delivery Fee",
            render: (item) => item.deliveryPrice ? `฿${item.deliveryPrice}` : "—"
        },
        {
            key: "beaches",
            label: "Beaches",
            className: "max-w-xs truncate"
        }
    ];

    const fields: FieldConfig[] = [
        { name: "name", label: "District Name", type: "text", required: true, placeholder: "e.g., Rawai" },
        { name: "locationId", label: "Location", type: "select", options: locations, required: true },
        { name: "deliveryPrice", label: "Delivery Fee (THB)", type: "number", placeholder: "500" },
        { name: "beaches", label: "Beaches / Highlights", type: "textarea", placeholder: "Rawai Beach, Nai Harn..." }
    ];

    const handleSearch = (val: string) => {
        const next = new URLSearchParams(searchParams);
        if (val) next.set("search", val);
        else next.delete("search");
        next.set("page", "1");
        setSearchParams(next, { replace: true });
    };

    const handleFormSubmit = (data: Record<string, unknown>) => {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                formData.append(key, String(value));
            }
        });
        formData.append("intent", editingDistrict ? "update" : "create");
        if (editingDistrict) formData.append("id", String(editingDistrict.id));
        
        submit(formData, { method: "post" });
        setIsFormOpen(false);
    };

    const handleDelete = () => {
        if (!editingDistrict) return;
        if (!confirm("Are you sure you want to delete this district?")) return;
        
        const formData = new FormData();
        formData.append("intent", "delete");
        formData.append("id", String(editingDistrict.id));
        submit(formData, { method: "post" });
        setIsFormOpen(false);
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Districts"
                withSearch
                searchValue={search}
                onSearchChange={handleSearch}
                searchPlaceholder="Search districts..."
                rightActions={
                    <Button
                        variant="solid"
                        icon={<PlusIcon className="w-5 h-5" />}
                        onClick={() => {
                            setEditingDistrict(null);
                            setIsFormOpen(true);
                        }}
                    >
                        Add
                    </Button>
                }
            />

            <DataTable<District>
                columns={columns}
                data={districts}
                totalCount={totalCount}
                serverPagination={true}
                isLoading={navigation.state === "loading"}
                emptyTitle="No districts found"
                getRowClassName={() => "cursor-pointer"}
                onRowClick={(item) => {
                    setEditingDistrict(item);
                    setIsFormOpen(true);
                }}
            />

            {isFormOpen && (
                <GenericDictionaryForm
                    title={editingDistrict ? "Edit District" : "Add District"}
                    fields={fields}
                    data={editingDistrict ? {
                        name: editingDistrict.name,
                        locationId: String(editingDistrict.locationId),
                        deliveryPrice: editingDistrict.deliveryPrice,
                        beaches: editingDistrict.beaches
                    } : null}
                    onSubmit={handleFormSubmit}
                    onCancel={() => setIsFormOpen(false)}
                    onDelete={editingDistrict ? handleDelete : undefined}
                />
            )}
        </div>
    );
}
