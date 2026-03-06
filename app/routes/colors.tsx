import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form, Link, Outlet } from "react-router";

import { requireAdmin } from "~/lib/auth.server";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";
import { redirectWithError } from "~/lib/route-feedback";
import { loadAdminPageData, runAdminMutationAction } from "~/lib/admin-crud.server";
import { loadAdminColors, type AdminColorRow } from "~/lib/admin-dictionaries.server";

type Color = AdminColorRow;

export async function loader({ request, context }: LoaderFunctionArgs) {
    await requireAdmin(request);
    return loadAdminPageData({
        request,
        context,
        loaders: {
            colors: loadAdminColors,
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const parsed = parseWithSchema(
        z
        .discriminatedUnion("intent", [
            z.object({
                intent: z.literal("delete"),
                id: z.coerce.number().int().positive("Color id is required"),
            }),
            z.object({
                intent: z.literal("seed"),
            }),
        ]),
        {
            intent: formData.get("intent"),
            id: formData.get("id"),
        },
        "Invalid action payload"
    );
    if (!parsed.ok) {
        return redirectWithError("/colors", "Invalid action payload");
    }

    if (parsed.data.intent === "delete") {
        const id = parsed.data.id;

        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                await db.prepare("DELETE FROM colors WHERE id = ?").bind(id).run();
            },
            feedback: {
                successPath: "/colors",
                successMessage: "Color deleted successfully",
                errorMessage: "Failed to delete color",
            },
            audit: {
                entityType: "color",
                entityId: id,
                action: "delete",
            },
        });
    }

    if (parsed.data.intent === "seed") {
        const defaultColors = [
            { name: "Yellow", hexCode: "#FFFF00" },
            { name: "White", hexCode: "#FFFFFF" },
            { name: "Silver", hexCode: "#C0C0C0" },
            { name: "Red", hexCode: "#FF0000" },
            { name: "Purple", hexCode: "#800080" },
            { name: "Orange", hexCode: "#FFA500" },
            { name: "Green", hexCode: "#008000" },
            { name: "Gray", hexCode: "#808080" },
            { name: "Gold", hexCode: "#FFD700" },
            { name: "Brown", hexCode: "#A52A2A" },
            { name: "Bronze", hexCode: "#CD7F32" },
            { name: "Blue", hexCode: "#0000FF" },
            { name: "Black", hexCode: "#000000" },
            { name: "Beige", hexCode: "#F5F5DC" },
        ];

        return runAdminMutationAction({
            request,
            context,
            mutate: async ({ db }) => {
                for (const color of defaultColors) {
                    await db
                        .prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)")
                        .bind(color.name, color.hexCode)
                        .run();
                }
            },
            feedback: {
                successPath: "/colors",
                successMessage: "Default colors created successfully",
                errorMessage: "Failed to create default colors",
            },
            audit: {
                entityType: "color",
                action: "create",
                afterState: { count: defaultColors.length, source: "seed" },
            },
        });
    }

    return redirectWithError("/colors", "Invalid action");
}

export default function ColorsPage() {
    const { colors } = useLoaderData<typeof loader>();
    useUrlToast();

    const columns: Column<Color>[] = [
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
            label: "Name",
            render: (item) => (
                <span className="font-medium text-gray-900">{item.name}</span>
            ),
        },
        {
            key: "color",
            label: "Color",
            render: (item) => (
                <div className="flex items-center gap-2">
                    <div
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: item.hexCode || "#000000" }}
                    />
                    <span className="text-gray-700 font-mono text-sm">
                        {item.hexCode || "-"}
                    </span>
                </div>
            ),
        },
        {
            key: "actions",
            label: "Actions",
            render: (item) => (
                <div className="flex gap-2">
                    <Link to={`/colors/${item.id}/edit`}>
                        <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                        >
                            Edit
                        </Button>
                    </Link>
                    <Form
                        method="post"
                        className="inline"
                    >
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={item.id} />
                        <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                        >
                            Delete
                        </Button>
                    </Form>
                </div>
            ),
        },
    ];

    return (
        <>
            <div className="space-y-4">
                <PageHeader
                    title="Car Colors"
                    rightActions={
                        <div className="flex gap-3">
                            {colors.length === 0 && (
                                <Form method="post">
                                    <input type="hidden" name="intent" value="seed" />
                                    <Button type="submit" variant="secondary">
                                        Load Default Data
                                    </Button>
                                </Form>
                            )}
                            <Link to="/colors/new">
                                <Button
                                    variant="primary"
                                    icon={<PlusIcon className="w-5 h-5" />}
                                >
                                    Add
                                </Button>
                            </Link>
                        </div>
                    }
                />

                {colors.length > 0 ? (
                    <DataTable
                        columns={columns}
                        data={colors}
                        disablePagination={true}
                        emptyTitle="No colors configured"
                        emptyDescription="Add available car colors to get started"
                    />
                ) : (
                    <div className="bg-white rounded-3xl shadow-sm p-12 py-4">
                        <div className="text-center">
                            <ColorIcon />
                            <h3 className="mt-4 text-lg font-medium text-gray-900">No colors configured</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                Add available car colors for your rental system
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Nested route outlet for modals */}
            <Outlet />
        </>
    );
}

function ColorIcon() {
    return (
        <SwatchIcon className="w-10 h-10 mx-auto text-gray-400" />
    );
}
