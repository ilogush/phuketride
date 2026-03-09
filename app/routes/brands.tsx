import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";

export const meta: MetaFunction = () => [
    { title: "Brands — Phuket Ride Admin" },
    { name: "description", content: "Manage car brands in the Phuket Ride dictionary." },
    { name: "robots", content: "noindex, nofollow" },
];
import { useState } from "react";
import DataTable, { type Column } from '~/components/dashboard/data-table/DataTable';
import Button from '~/components/shared/ui/Button';
import PageHeader from '~/components/shared/ui/PageHeader';
import PageSearchInput from '~/components/shared/ui/PageSearchInput';
import { PlusIcon, TagIcon } from "@heroicons/react/24/outline";
import IdBadge from '~/components/shared/ui/IdBadge';
import { brandSchema } from "~/schemas/dictionary";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { z } from "zod";
import type { AdminBrandRow } from "~/lib/admin-dictionaries";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";
import { getPaginationFromUrl } from "~/lib/pagination.server";

type Brand = AdminBrandRow;


export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const { page, pageSize, offset } = getPaginationFromUrl(url, { defaultPageSize: 30 });

    return trackServerOperation({
        event: "brands.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "brands", search, page, pageSize },
        run: async () => {
            const [brands, totalCount] = await Promise.all([
                sdb.brands.listPage({ limit: pageSize, offset, search }),
                sdb.brands.count(search),
            ]);
            return { brands, totalCount, search, page, pageSize };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { sdb } = await getScopedDb(request, context);
    const formData = await request.formData();
    const intent = formData.get("intent");

    const parsed = parseWithSchema(
        z.discriminatedUnion("intent", [
            z.object({
                intent: z.literal("delete"),
                id: z.coerce.number().int().positive(),
            }),
            brandSchema.extend({
                intent: z.literal("create"),
                logo: z.string().optional().nullable(),
            }),
            brandSchema.extend({
                intent: z.literal("update"),
                id: z.coerce.number().int().positive(),
                logo: z.string().optional().nullable(),
            }),
        ]),
        Object.fromEntries(formData),
        "Invalid action payload"
    );

    if (!parsed.ok) {
        return redirectWithError("/brands", parsed.error);
    }

    const data = parsed.data;

    if (data.intent === "delete") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("DELETE FROM car_brands WHERE id = ?").bind(data.id).run();
            },
            feedback: { successPath: "/brands", successMessage: "Brand deleted", errorMessage: "Failed to delete brand" },
            audit: { entityType: "brand", entityId: data.id, action: "delete" },
        });
    }

    if (data.intent === "create") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("INSERT INTO car_brands (name, logo) VALUES (?, ?)").bind(data.name, data.logo || null).run();
            },
            feedback: { successPath: "/brands", successMessage: "Brand created", errorMessage: "Failed to create brand" },
            audit: { entityType: "brand", action: "create", afterState: data },
        });
    }

    if (data.intent === "update") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("UPDATE car_brands SET name = ?, logo = ? WHERE id = ?").bind(data.name, data.logo || null, data.id).run();
            },
            feedback: { successPath: "/brands", successMessage: "Brand updated", errorMessage: "Failed to update brand" },
            audit: { entityType: "brand", entityId: data.id, action: "update", afterState: data },
        });
    }

    return redirectWithError("/brands", "Invalid action");
}

export default function BrandsPage() {
    const { brands, totalCount, search } = useLoaderData<typeof loader>();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingBrand,
        setIsFormOpen,
        setEditingItem: setEditingBrand,
    });

    const columns: Column<Brand>[] = [
        { 
            key: "id", 
            label: "ID", 
            className: "w-16",
            render: (item) => (
                <IdBadge>
                    {String(item.id).padStart(3, '0')}
                </IdBadge>
            )
        },
        { 
            key: "name", 
            label: "Name",
            render: (item) => (
                <div className="flex items-center gap-3">
                    {item.logo ? (
                        <img src={item.logo} alt={item.name} className="w-8 h-8 rounded object-contain border border-gray-100" />
                    ) : (
                        <div className="w-8 h-8 bg-gray-50 rounded flex items-center justify-center">
                            <TagIcon className="w-4 h-4 text-gray-300" />
                        </div>
                    )}
                    <span className="font-medium text-gray-900">{item.name}</span>
                </div>
            )
        },
        { key: "modelsCount", label: "Models", className: "w-24 text-center" },
        { 
            key: "createdAt", 
            label: "Created",
            render: (item) => item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"
        },
    ];

    const fields: FieldConfig[] = [
        { name: "name", label: "Brand Name", type: "text", required: true, placeholder: "e.g., Toyota" },
        { name: "logo", label: "Logo URL", type: "text", placeholder: "https://..." },
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
                title="Brands"
                searchSlot={<PageSearchInput value={search} onChange={handleSearch} placeholder="Search brands..." />}
                rightSlot={
                    <Button
                        variant="primary"
                        leadingIcon={<PlusIcon className="w-5 h-5" />}
                        onClick={() => {
                            setEditingBrand(null);
                            setIsFormOpen(true);
                        }}
                    >
                        Add
                    </Button>
                }
            />

            <DataTable<Brand>
                columns={columns}
                data={brands}
                totalCount={totalCount}
                serverPagination={true}
                isLoading={navigation.state === "loading"}
                emptyTitle="No brands found"
                getRowClassName={() => "cursor-pointer"}
                onRowClick={(item) => {
                    setEditingBrand(item);
                    setIsFormOpen(true);
                }}
            />

            {isFormOpen && (
                <GenericDictionaryForm
                    title={editingBrand ? "Edit Brand" : "Add Brand"}
                    fields={fields}
                    data={editingBrand ? {
                        name: editingBrand.name,
                        logo: editingBrand.logo
                    } : null}
                    onSubmit={handleFormSubmit}
                    onCancel={() => { setIsFormOpen(false); setEditingBrand(null); }}
                    onDelete={editingBrand ? () => handleDelete("Delete this brand?") : undefined}
                />
            )}
        </div>
    );
}
