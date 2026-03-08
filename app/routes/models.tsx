import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { useState } from "react";

export const meta: MetaFunction = () => [
    { title: "Car Models — Phuket Ride Admin" },
    { name: "description", content: "Manage car models in the Phuket Ride dictionary." },
    { name: "robots", content: "noindex, nofollow" },
];

import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon, CubeIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { modelSchema } from "~/schemas/dictionary";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { getCachedBodyTypes, getCachedCarBrands } from "~/lib/dictionaries-cache.server";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";
import { z } from "zod";
import type { AdminModelRow } from "~/lib/admin-dictionaries";

type ModelRow = AdminModelRow;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const { page, pageSize, offset } = getPaginationFromUrl(url, { defaultPageSize: 20 });

    return trackServerOperation({
        event: "models.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "models", search, page, pageSize },
        run: async () => {
            const [modelsResult, totalCount, brandsResult, bodyTypesResult] = await Promise.all([
                sdb.models.listPage({ limit: pageSize, offset, search }),
                sdb.models.count(search),
                getCachedCarBrands(context.cloudflare.env.DB),
                getCachedBodyTypes(context.cloudflare.env.DB),
            ]);

            return {
                models: modelsResult,
                totalCount,
                search,
                page,
                pageSize,
                brands: brandsResult as Array<{ id: number; name: string }>,
                bodyTypes: bodyTypesResult as Array<{ id: number; name: string }>,
            };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    await getScopedDb(request, context);
    const formData = await request.formData();

    const parsed = parseWithSchema(
        z.discriminatedUnion("intent", [
            z.object({
                intent: z.literal("delete"),
                id: z.coerce.number().int().positive(),
            }),
            z.object({
                intent: z.literal("create"),
                name: z.string().trim().min(1, "Name is required").max(100),
                brandId: z.coerce.number().int().positive(),
                bodyTypeId: z.coerce.number().int().positive().optional().nullable(),
            }),
            z.object({
                intent: z.literal("update"),
                id: z.coerce.number().int().positive(),
                name: z.string().trim().min(1, "Name is required").max(100),
                brandId: z.coerce.number().int().positive(),
                bodyTypeId: z.coerce.number().int().positive().optional().nullable(),
            }),
        ]),
        Object.fromEntries(formData),
        "Invalid action payload"
    );

    if (!parsed.ok) {
        return redirectWithError("/models", parsed.error);
    }

    const data = parsed.data;

    if (data.intent === "delete") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("DELETE FROM car_models WHERE id = ?").bind(data.id).run();
            },
            feedback: { successPath: "/models", successMessage: "Model deleted", errorMessage: "Failed to delete model" },
            audit: { entityType: "model", entityId: data.id, action: "delete" },
        });
    }

    if (data.intent === "create") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("INSERT INTO car_models (name, brand_id, body_type_id) VALUES (?, ?, ?)")
                    .bind(data.name, data.brandId, data.bodyTypeId || null)
                    .run();
            },
            feedback: { successPath: "/models", successMessage: "Model created", errorMessage: "Failed to create model" },
            audit: { entityType: "model", action: "create", afterState: data },
        });
    }

    if (data.intent === "update") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("UPDATE car_models SET name = ?, brand_id = ?, body_type_id = ? WHERE id = ?")
                    .bind(data.name, data.brandId, data.bodyTypeId || null, data.id)
                    .run();
            },
            feedback: { successPath: "/models", successMessage: "Model updated", errorMessage: "Failed to update model" },
            audit: { entityType: "model", entityId: data.id, action: "update", afterState: data },
        });
    }

    return redirectWithError("/models", "Invalid action");
}

export default function ModelsPage() {
    const { models, brands, bodyTypes, totalCount, search, page, pageSize } = useLoaderData<typeof loader>();
    useUrlToast();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingModel, setEditingModel] = useState<ModelRow | null>(null);

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingModel,
        setIsFormOpen,
        setEditingItem: setEditingModel,
    });

    const columns: Column<ModelRow>[] = [
        { key: "id", label: "ID", className: "w-16" },
        {
            key: "brandName",
            label: "Brand",
            render: (item) => <span className="text-gray-600">{item.brandName}</span>
        },
        {
            key: "name",
            label: "Model Name",
            render: (item) => <span className="font-medium text-gray-900">{item.name}</span>
        },
        {
            key: "bodyTypeName",
            label: "Body Type",
            render: (item) => <span className="text-gray-500">{item.bodyTypeName || "—"}</span>
        },
    ];

    const fields: FieldConfig[] = [
        {
            name: "brandId",
            label: "Brand",
            type: "select",
            required: true,
            options: brands.map(b => ({ id: String(b.id), name: b.name }))
        },
        {
            name: "name",
            label: "Model Name",
            type: "text",
            required: true,
            placeholder: "e.g., Camry, X5"
        },
        {
            name: "bodyTypeId",
            label: "Body Type (Optional)",
            type: "select",
            options: [{ id: "", name: "Not specified" }, ...bodyTypes.map(b => ({ id: String(b.id), name: b.name }))]
        },
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
                title="Car Models"
                withSearch
                searchValue={search}
                onSearchChange={handleSearch}
                searchPlaceholder="Search models..."
                rightActions={
                    <Button
                        variant="solid"
                        icon={<PlusIcon className="w-5 h-5" />}
                        onClick={() => {
                            setEditingModel(null);
                            setIsFormOpen(true);
                        }}
                    >
                        Add
                    </Button>
                }
            />

            <DataTable<ModelRow>
                columns={columns}
                data={models}
                totalCount={totalCount}
                serverPagination={true}
                isLoading={navigation.state === "loading"}
                emptyTitle="No models found"
                emptyDescription="Add models to the database"
                emptyIcon={<CubeIcon className="w-10 h-10 text-gray-400" />}
                getRowClassName={() => "cursor-pointer"}
                onRowClick={(item) => {
                    setEditingModel(item);
                    setIsFormOpen(true);
                }}
            />

            {isFormOpen && (
                <GenericDictionaryForm
                    title={editingModel ? "Edit Model" : "Add Model"}
                    fields={fields}
                    data={editingModel ? {
                        brandId: String(editingModel.brandId),
                        name: editingModel.name,
                        bodyTypeId: editingModel.bodyTypeId ? String(editingModel.bodyTypeId) : ""
                    } : null}
                    onSubmit={handleFormSubmit}
                    onCancel={() => { setIsFormOpen(false); setEditingModel(null); }}
                    onDelete={editingModel ? () => handleDelete("Delete this model?") : undefined}
                />
            )}
        </div>
    );
}
