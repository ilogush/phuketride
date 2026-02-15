import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, Link, Outlet, useSearchParams } from "react-router";
import { useEffect } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon, SwatchIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";

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
        
        // Get current color for audit log
        const currentColor = await db
            .select()
            .from(schema.colors)
            .where(eq(schema.colors.id, id))
            .limit(1);

        try {
            await db.delete(schema.colors).where(eq(schema.colors.id, id));

            // Audit log
            const metadata = getRequestMetadata(request);
            quickAudit({
                db,
                userId: user.id,
                role: user.role,
                companyId: user.companyId,
                entityType: "color",
                entityId: id,
                action: "delete",
                beforeState: currentColor[0],
                ...metadata,
            });

            return redirect("/colors?success=Color deleted successfully");
        } catch (error) {
            console.error("Failed to delete color:", error);
            return redirect("/colors?error=Failed to delete color");
        }
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

        try {
            for (const color of defaultColors) {
                await db.insert(schema.colors).values(color);
            }
            return redirect("/colors?success=Default colors created successfully");
        } catch (error) {
            console.error("Failed to create default colors:", error);
            return redirect("/colors?error=Failed to create default colors");
        }
    }

    return redirect("/colors?error=Invalid action");
}

export default function ColorsPage() {
    const { colors } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();

    // Show toast messages from redirects
    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        
        if (success) {
            toast.success(success);
        }
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    const columns: Column<Color>[] = [
        {
            key: "id",
            label: "ID",
            render: (item) => (
                <span className="font-mono text-xs bg-gray-800 text-white px-2 py-1 rounded-xl">
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
        <SwatchIcon className="w-16 h-16 mx-auto text-gray-400" />
    );
}
