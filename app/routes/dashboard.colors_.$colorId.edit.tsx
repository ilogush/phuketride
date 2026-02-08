import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useNavigate, useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import Button from "~/components/dashboard/Button";
import { useState } from "react";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const colorId = Number(params.colorId);

    const color = await db
        .select()
        .from(schema.colors)
        .where(eq(schema.colors.id, colorId))
        .limit(1);

    if (!color[0]) {
        throw new Response("Color not found", { status: 404 });
    }

    return { color: color[0] };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const colorId = Number(params.colorId);

    const name = formData.get("name") as string;
    const hexCode = formData.get("hexCode") as string;

    await db
        .update(schema.colors)
        .set({
            name,
            hexCode: hexCode || null,
        })
        .where(eq(schema.colors.id, colorId));

    return redirect("/colors");
}

export default function EditColorModal() {
    const navigate = useNavigate();
    const { color } = useLoaderData<typeof loader>();
    const [formData, setFormData] = useState({
        name: color.name,
        hexCode: color.hexCode || "#000000",
    });

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
