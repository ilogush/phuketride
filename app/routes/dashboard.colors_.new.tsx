import { type ActionFunctionArgs, redirect } from "react-router";
import { Form, useNavigate, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import { useState, useEffect } from "react";
import { useToast } from "~/lib/toast";
import { colorSchema } from "~/schemas/dictionary";

export async function action({ request, context }: ActionFunctionArgs) {
    await requireAuth(request);
    const formData = await request.formData();

    const rawData = {
        name: formData.get("name") as string,
        hexCode: (formData.get("hexCode") as string) || null,
    };

    // Validate with Zod
    const validation = colorSchema.safeParse(rawData);
    if (!validation.success) {
        const firstError = validation.error.errors[0];
        return redirect(`/colors/new?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        await context.cloudflare.env.DB
            .prepare("INSERT INTO colors (name, hex_code) VALUES (?, ?)")
            .bind(validData.name, validData.hexCode)
            .run();

        return redirect("/colors?success=Color created successfully");
    } catch {
        return redirect("/colors/new?error=Failed to create color");
    }
}

export default function NewColorModal() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const [formData, setFormData] = useState({
        name: "",
        hexCode: "#000000",
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
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate("/colors")}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Create Color
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
