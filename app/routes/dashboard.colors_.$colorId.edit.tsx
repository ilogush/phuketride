import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useNavigate, useLoaderData, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import { useState, useEffect } from "react";
import { useToast } from "~/lib/toast";
import { colorSchema } from "~/schemas/dictionary";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    await requireAuth(request);
    const colorId = Number(params.colorId);

    const colorResult = await context.cloudflare.env.DB
        .prepare("SELECT id, name, hex_code AS hexCode FROM colors WHERE id = ? LIMIT 1")
        .bind(colorId)
        .all();
    const color = (colorResult.results ?? []) as Array<{ id: number; name: string; hexCode: string | null }>;

    if (!color[0]) {
        throw new Response("Color not found", { status: 404 });
    }

    return { color: color[0] };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    await requireAuth(request);
    const formData = await request.formData();
    const colorId = Number(params.colorId);

    // Get current color for audit log
    const currentColorResult = await context.cloudflare.env.DB
        .prepare("SELECT id, name, hex_code AS hexCode FROM colors WHERE id = ? LIMIT 1")
        .bind(colorId)
        .all();
    const currentColor = (currentColorResult.results ?? []) as Array<{ id: number; name: string; hexCode: string | null }>;

    if (!currentColor[0]) {
        return redirect("/colors?error=Color not found");
    }

    const rawData = {
        name: formData.get("name") as string,
        hexCode: (formData.get("hexCode") as string) || null,
    };

    // Validate with Zod
    const validation = colorSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/colors/${colorId}/edit?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        await context.cloudflare.env.DB
            .prepare("UPDATE colors SET name = ?, hex_code = ? WHERE id = ?")
            .bind(validData.name, validData.hexCode, colorId)
            .run();

        return redirect("/colors?success=Color updated successfully");
    } catch {
        return redirect(`/colors/${colorId}/edit?error=Failed to update color`);
    }
}

export default function EditColorModal() {
    const navigate = useNavigate();
    const { color } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const [formData, setFormData] = useState({
        name: color.name,
        hexCode: color.hexCode || "#000000",
    });

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    return (
        <Modal
            title="Edit Color"
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
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate("/colors")}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Update Color
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
