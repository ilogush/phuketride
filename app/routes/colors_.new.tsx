import { type ActionFunctionArgs, redirect } from "react-router";
import { Form, useNavigate } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import { useState } from "react";
import { useUrlToast } from "~/lib/useUrlToast";
import { colorSchema } from "~/schemas/dictionary";
import { parseWithSchema } from "~/lib/validation.server";
import { runAdminMutationAction } from "~/lib/admin-crud.server";

export async function action({ request, context }: ActionFunctionArgs) {
    await requireAdmin(request);
    const formData = await request.formData();

    const rawData = {
        name: formData.get("name") as string,
        hexCode: (formData.get("hexCode") as string) || null,
    };

    // Validate with Zod
    const validation = parseWithSchema(colorSchema, rawData, "Validation failed");
    if (!validation.ok) {
        return redirect(`/colors/new?error=${encodeURIComponent(validation.error)}`);
    }

    const validData = validation.data;

    return runAdminMutationAction({
        request,
        context,
        mutate: async ({ db }) => {
            await db
                .prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)")
                .bind(validData.name, validData.hexCode)
                .run();
        },
        feedback: {
            successPath: "/colors",
            successMessage: "Color created successfully",
            errorPath: "/colors/new",
            errorMessage: "Failed to create color",
        },
        audit: {
            entityType: "color",
            action: "create",
            afterState: validData,
        },
    });
}

export default function NewColorModal() {
    const navigate = useNavigate();
    useUrlToast();
    const [formData, setFormData] = useState({
        name: "",
        hexCode: "#000000",
    });

    return (
        <Modal
            title="Add Color"
            isOpen={true}
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
                    <Button type="submit" variant="primary">
                        Create Color
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
