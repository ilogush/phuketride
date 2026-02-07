import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { useState } from "react";
import DataTable, { type Column } from "~/components/ui/DataTable";
import Button from "~/components/ui/Button";
import Modal from "~/components/ui/Modal";
import { Input } from "~/components/ui/Input";
import PageHeader from "~/components/ui/PageHeader";
import { PlusIcon } from "@heroicons/react/24/outline";

interface Color {
    id: number;
    name: string;
    hexCode: string | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    const colors = await db
        .select()
        .from(schema.colors)
        .limit(100);

    return { user, colors };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const id = Number(formData.get("id"));
        await db.delete(schema.colors).where(eq(schema.colors.id, id));
        return data({ success: true, message: "Color deleted successfully" });
    }

    if (intent === "create") {
        const name = formData.get("name") as string;
        const hexCode = formData.get("hexCode") as string;

        await db.insert(schema.colors).values({
            name,
            hexCode: hexCode || null,
        });

        return data({ success: true, message: "Color created successfully" });
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const name = formData.get("name") as string;
        const hexCode = formData.get("hexCode") as string;

        await db
            .update(schema.colors)
            .set({
                name,
                hexCode: hexCode || null,
            })
            .where(eq(schema.colors.id, id));

        return data({ success: true, message: "Color updated successfully" });
    }

    if (intent === "seed") {
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

        for (const color of defaultColors) {
            await db.insert(schema.colors).values(color);
        }

        return data({ success: true, message: "Default colors created successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function ColorsPage() {
    const { colors } = useLoaderData<typeof loader>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingColor, setEditingColor] = useState<Color | null>(null);
    const [formData, setFormData] = useState({
        name: "",
        hexCode: "#000000",
    });

    const handleEdit = (color: Color) => {
        setEditingColor(color);
        setFormData({
            name: color.name,
            hexCode: color.hexCode || "#000000",
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingColor(null);
        setFormData({
            name: "",
            hexCode: "#000000",
        });
    };

    const columns: Column<Color>[] = [
        {
            key: "id",
            label: "ID",
            render: (item) => (
                <span className="font-mono text-sm bg-gray-800 text-white px-2 py-1 rounded-full">
                    {String(item.id).padStart(4, "0")}
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
                        <Button
                            variant="primary"
                            icon={<PlusIcon className="w-5 h-5" />}
                            onClick={() => setIsModalOpen(true)}
                        >
                            Add Color
                        </Button>
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
                <div className="bg-white rounded-3xl shadow-sm p-12 border border-gray-200 py-4">
                    <div className="text-center">
                        <ColorIcon />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No colors configured</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Add available car colors for your rental system
                        </p>
                    </div>
                </div>
            )}

            <Modal
                title={editingColor ? "Edit Color" : "Add Color"}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                size="md"
            >
                <Form method="post" className="space-y-4" onSubmit={handleCloseModal}>
                    <input type="hidden" name="intent" value={editingColor ? "update" : "create"} />
                    {editingColor && <input type="hidden" name="id" value={editingColor.id} />}

                    <Input
                        label="Color Name"
                        name="name"
                        value={formData.name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Red"
                        required
                    />

                    <div>
                        <label className="block text-xs text-gray-600 mb-1">
                            Hex Code
                        </label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                value={formData.hexCode}
                                onChange={(e) => setFormData({ ...formData, hexCode: e.target.value })}
                                className="w-16 h-10 rounded-xl border border-gray-300 cursor-pointer"
                            />
                            <Input
                                name="hexCode"
                                value={formData.hexCode}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, hexCode: e.target.value })}
                                placeholder="#000000"
                                className="flex-1"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingColor ? "Update Color" : "Create Color"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

function ColorIcon() {
    return (
        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
    );
}
