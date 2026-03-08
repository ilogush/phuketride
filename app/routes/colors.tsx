import { type LoaderFunctionArgs, type ActionFunctionArgs, type MetaFunction } from "react-router";
import { useLoaderData, useNavigation, useSearchParams } from "react-router";
import { useState } from "react";

export const meta: MetaFunction = () => [
    { title: "Car Colors — Phuket Ride Admin" },
    { name: "description", content: "Manage car colors in the Phuket Ride dictionary." },
    { name: "robots", content: "noindex, nofollow" },
];

import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon } from "@heroicons/react/24/outline";
import IdBadge from "~/components/dashboard/IdBadge";
import { useUrlToast } from "~/lib/useUrlToast";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { runAdminMutationAction } from "~/lib/admin-crud.server";
import { type AdminColorRow } from "~/lib/admin-dictionaries";
import { GenericDictionaryForm, type FieldConfig } from "~/components/dashboard/GenericDictionaryForm";
import { getScopedDb } from "~/lib/db-factory.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { getPaginationFromUrl } from "~/lib/pagination.server";
import { useDictionaryFormActions } from "~/hooks/useDictionaryFormActions";
import { useSubmit } from "react-router";

type Color = AdminColorRow;

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const { page, pageSize, offset } = getPaginationFromUrl(url, { defaultPageSize: 50 });

    return trackServerOperation({
        event: "colors.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "colors", search, page, pageSize },
        run: async () => {
            const [colors, totalCount] = await Promise.all([
                sdb.colors.listPage({ limit: pageSize, offset, search }),
                sdb.colors.count(search),
            ]);
            return { colors, totalCount, search, page, pageSize };
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
                id: z.coerce.number().int().positive("Color id is required"),
            }),
            z.object({
                intent: z.literal("create"),
                name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
                hexCode: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex code"),
            }),
            z.object({
                intent: z.literal("update"),
                id: z.coerce.number().int().positive("Color id is required"),
                name: z.string().trim().min(1, "Name is required").max(100, "Name is too long"),
                hexCode: z.string().trim().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex code"),
            }),
            z.object({
                intent: z.literal("seed"),
            }),
        ]),
        Object.fromEntries(formData),
        "Invalid action payload"
    );

    if (!parsed.ok) {
        return redirectWithError("/colors", parsed.error);
    }

    const data = parsed.data;

    if (data.intent === "delete") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("DELETE FROM colors WHERE id = ?").bind(data.id).run();
            },
            feedback: {
                successPath: "/colors",
                successMessage: "Color deleted successfully",
                errorMessage: "Failed to delete color",
            },
            audit: { entityType: "color", entityId: data.id, action: "delete" },
        });
    }

    if (data.intent === "create") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)")
                    .bind(data.name, data.hexCode)
                    .run();
            },
            feedback: {
                successPath: "/colors",
                successMessage: "Color created successfully",
                errorMessage: "Failed to create color",
            },
            audit: { entityType: "color", action: "create", afterState: data },
        });
    }

    if (data.intent === "update") {
        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db
                    .prepare("UPDATE colors SET name = ?, hex_code = ? WHERE id = ?")
                    .bind(data.name, data.hexCode, data.id)
                    .run();
            },
            feedback: {
                successPath: "/colors",
                successMessage: "Color updated successfully",
                errorMessage: "Failed to update color",
            },
            audit: { entityType: "color", entityId: data.id, action: "update", afterState: data },
        });
    }

    if (data.intent === "seed") {
        const defaultColors = [
            { name: "White", hexCode: "#FFFFFF" },
            { name: "Black", hexCode: "#000000" },
            { name: "Silver", hexCode: "#C0C0C0" },
            { name: "Gray", hexCode: "#808080" },
            { name: "Red", hexCode: "#FF0000" },
            { name: "Blue", hexCode: "#0000FF" },
            { name: "Yellow", hexCode: "#FFFF00" },
        ];

        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                for (const color of defaultColors) {
                    await db.prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)").bind(color.name, color.hexCode).run();
                }
            },
            feedback: { successPath: "/colors", successMessage: "Seeded colors", errorMessage: "Failed to seed colors" },
            audit: { entityType: "color", action: "create" },
        });
    }

    return redirectWithError("/colors", "Invalid action");
}

export default function ColorsPage() {
    const { colors, totalCount, search } = useLoaderData<typeof loader>();
    useUrlToast();
    const submit = useSubmit();
    const navigation = useNavigation();
    const [searchParams, setSearchParams] = useSearchParams();

    const [editingColor, setEditingColor] = useState<Color | null>(null);

    const { handleFormSubmit, handleDelete } = useDictionaryFormActions({
        editingItem: editingColor,
        setIsFormOpen: () => {}, // No longer used
        setEditingItem: setEditingColor,
    });

    const columns: Column<Color>[] = [
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
                <span className="font-medium text-gray-900">{item.name}</span>
            ),
        },
        {
            key: "hexCode",
            label: "Color",
            render: (item) => (
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: item.hexCode || "#000000" }}
                    />
                    <span className="text-gray-700 font-mono text-xs uppercase">
                        {item.hexCode || "-"}
                    </span>
                </div>
            ),
        },
    ];

    const fields: FieldConfig[] = [
        { name: "name", label: "Color Name", type: "text", required: true, placeholder: "e.g., Pearl White" },
        { name: "hexCode", label: "Color Value", type: "color", required: true, placeholder: "#FFFFFF" },
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
                title="Car Colors"
                rightActions={
                    <div className="flex gap-2">
                        {totalCount === 0 && (
                            <Button variant="outline" onClick={() => {
                                const fd = new FormData();
                                fd.append("intent", "seed");
                                submit(fd, { method: "post" });
                            }}>
                                Seed Defaults
                            </Button>
                        )}
                    </div>
                }
            />

            <div className="flex flex-col lg:flex-row gap-4 items-start">
                <div className="flex-1 w-full">
                    <DataTable<Color>
                        columns={columns}
                        data={colors}
                        totalCount={totalCount}
                        serverPagination={true}
                        isLoading={navigation.state === "loading"}
                        emptyTitle="No colors found"
                        getRowClassName={() => "cursor-pointer"}
                        onRowClick={(item) => {
                            setEditingColor(item);
                        }}
                    />
                </div>

                <div className="w-full lg:w-80 shrink-0">
                    <GenericDictionaryForm
                        mode="sidebar"
                        title={editingColor ? "Edit Color" : "Add Color"}
                        fields={fields}
                        data={editingColor ? {
                            name: editingColor.name,
                            hexCode: editingColor.hexCode
                        } : null}
                        onSubmit={handleFormSubmit}
                        onCancel={() => { setEditingColor(null); }}
                        onDelete={editingColor ? () => handleDelete("Are you sure you want to delete this color?") : undefined}
                    />
                </div>
            </div>
        </div>
    );
}
