import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useNavigate, useLoaderData } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import { useState } from "react";
import { useUrlToast } from "~/lib/useUrlToast";
import { colorSchema } from "~/schemas/dictionary";
import { parseWithSchema } from "~/lib/validation.server";
import { requireAdminDb, runAdminMutationAction } from "~/lib/admin-crud.server";
import { loadAdminColorById } from "~/lib/admin-dictionaries.server";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    await requireAdmin(request);
    const { db } = await requireAdminDb(request, context);
    const colorId = Number(params.colorId);
    const color = await loadAdminColorById(db, colorId);
    if (!color) {
        throw new Response("Color not found", { status: 404 });
    }

    return { color };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();
    const colorId = Number(params.colorId);
    const { db } = await requireAdminDb(request, context);
    const currentColor = await loadAdminColorById(db, colorId);

    if (!currentColor) {
        return redirect("/colors?error=Color not found");
    }

    const rawData = {
        name: formData.get("name") as string,
        hexCode: (formData.get("hexCode") as string) || null,
    };

    // Validate with Zod
    const validation = parseWithSchema(colorSchema, rawData, "Validation failed");
    if (!validation.ok) {
        return redirect(`/colors/${colorId}/edit?error=${encodeURIComponent(validation.error)}`);
    }

    const validData = validation.data;

    return runAdminMutationAction({
        request,
        context,
        mutate: async ({ db: mutationDb }) => {
            await mutationDb
                .prepare("UPDATE colors SET name = ?, hex_code = ? WHERE id = ?")
                .bind(validData.name, validData.hexCode, colorId)
                .run();
        },
        feedback: {
            successPath: "/colors",
            successMessage: "Color updated successfully",
            errorPath: `/colors/${colorId}/edit`,
            errorMessage: "Failed to update color",
        },
        audit: {
            entityType: "color",
            entityId: colorId,
            action: "update",
            beforeState: currentColor,
            afterState: validData,
        },
    });
}

export default function EditColorModal() {
    const navigate = useNavigate();
    const { color } = useLoaderData<typeof loader>();
    useUrlToast();
    const [formData, setFormData] = useState({
        name: color.name,
        hexCode: color.hexCode || "#000000",
    });

    return (
        <Modal
            title="Edit Color"
            open={true}
            onClose={() => navigate("/colors")}
            size="md"
        >
            <Form method="post" className="space-y-4">
                <Input
                    label="Color Name"
                    name="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({ ...formData, name: e.target.value })
                    }
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
                            onChange={(e) =>
                                setFormData({ ...formData, hexCode: e.target.value })
                            }
                            className="w-16 h-10 rounded-xl border border-gray-300 cursor-pointer"
                        />
                        <Input
                            name="hexCode"
                            value={formData.hexCode}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                setFormData({ ...formData, hexCode: e.target.value })
                            }
                            placeholder="#000000"
                            className="flex-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="submit" variant="solid">
                        Update Color
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
