import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { useState } from "react";
import DataTable, { type Column } from "~/components/ui/DataTable";
import Button from "~/components/ui/Button";
import Modal from "~/components/ui/Modal";
import { Input } from "~/components/ui/Input";
import PageHeader from "~/components/ui/PageHeader";
import { TrashIcon, PlusIcon, PencilIcon } from "@heroicons/react/24/outline";

interface RentalDuration {
    id: number;
    companyId: number;
    rangeName: string;
    minDays: number;
    maxDays: number | null;
    priceMultiplier: number;
    discountLabel: string | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    // For demo purposes, using companyId = 1
    // In production, get from user's company or admin context
    const companyId = 1;

    const durations = await db
        .select()
        .from(schema.rentalDurations)
        .where(eq(schema.rentalDurations.companyId, companyId))
        .limit(100);

    return { user, durations, companyId };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    const companyId = 1; // Same as loader

    if (intent === "delete") {
        const id = Number(formData.get("id"));

        await db
            .delete(schema.rentalDurations)
            .where(
                and(
                    eq(schema.rentalDurations.id, id),
                    eq(schema.rentalDurations.companyId, companyId)
                )
            );

        return data({ success: true, message: "Duration deleted successfully" });
    }

    if (intent === "create") {
        const rangeName = formData.get("rangeName") as string;
        const minDays = Number(formData.get("minDays"));
        const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        await db.insert(schema.rentalDurations).values({
            companyId,
            rangeName,
            minDays,
            maxDays,
            priceMultiplier,
            discountLabel: discountLabel || null,
        });

        return data({ success: true, message: "Duration created successfully" });
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const rangeName = formData.get("rangeName") as string;
        const minDays = Number(formData.get("minDays"));
        const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        await db
            .update(schema.rentalDurations)
            .set({
                rangeName,
                minDays,
                maxDays,
                priceMultiplier,
                discountLabel: discountLabel || null,
            })
            .where(
                and(
                    eq(schema.rentalDurations.id, id),
                    eq(schema.rentalDurations.companyId, companyId)
                )
            );

        return data({ success: true, message: "Duration updated successfully" });
    }

    if (intent === "seed") {
        // Insert default durations from the screenshot
        const defaultDurations = [
            { rangeName: "1-3 days", minDays: 1, maxDays: 3, priceMultiplier: 1, discountLabel: "Base" },
            { rangeName: "4-7 days", minDays: 4, maxDays: 7, priceMultiplier: 0.95, discountLabel: "-5%" },
            { rangeName: "8-14 days", minDays: 8, maxDays: 14, priceMultiplier: 0.9, discountLabel: "-10%" },
            { rangeName: "15-21 days", minDays: 15, maxDays: 21, priceMultiplier: 0.85, discountLabel: "-15%" },
            { rangeName: "22-28 days", minDays: 22, maxDays: 28, priceMultiplier: 0.8, discountLabel: "-20%" },
            { rangeName: "29+ days", minDays: 29, maxDays: null, priceMultiplier: 0.75, discountLabel: "-25%" },
        ];

        for (const duration of defaultDurations) {
            await db.insert(schema.rentalDurations).values({
                companyId,
                ...duration,
            });
        }

        return data({ success: true, message: "Default durations created successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function DurationsPage() {
    const { user, durations, companyId } = useLoaderData<typeof loader>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDuration, setEditingDuration] = useState<RentalDuration | null>(null);
    const [formData, setFormData] = useState({
        rangeName: "",
        minDays: "",
        maxDays: "",
        priceMultiplier: "1",
        discountLabel: "",
    });

    const handleEdit = (duration: RentalDuration) => {
        setEditingDuration(duration);
        setFormData({
            rangeName: duration.rangeName,
            minDays: String(duration.minDays),
            maxDays: duration.maxDays ? String(duration.maxDays) : "",
            priceMultiplier: String(duration.priceMultiplier),
            discountLabel: duration.discountLabel || "",
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingDuration(null);
        setFormData({
            rangeName: "",
            minDays: "",
            maxDays: "",
            priceMultiplier: "1",
            discountLabel: "",
        });
    };

    const columns: Column<RentalDuration>[] = [
        {
            key: "rangeName",
            label: "Range Name",
            render: (item) => (
                <span className="font-medium text-gray-900">{item.rangeName}</span>
            ),
        },
        {
            key: "minDays",
            label: "Min Days",
            render: (item) => (
                <span className="text-gray-700">{item.minDays}</span>
            ),
        },
        {
            key: "maxDays",
            label: "Max Days (0 = unlimited)",
            render: (item) => (
                <span className="text-gray-700">{item.maxDays || "0"}</span>
            ),
        },
        {
            key: "priceMultiplier",
            label: "Price Multiplier",
            render: (item) => (
                <span className="text-gray-700">{item.priceMultiplier}</span>
            ),
        },
        {
            key: "discountLabel",
            label: "Discount Label",
            render: (item) => (
                <span className="text-gray-600">{item.discountLabel || "-"}</span>
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
                title="Rental Durations"
                rightActions={
                    <div className="flex gap-3">
                        {durations.length === 0 && (
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
                            Add Duration
                        </Button>
                    </div>
                }
            />

            {durations.length > 0 ? (
                <DataTable
                    columns={columns}
                    data={durations}
                    disablePagination={true}
                    emptyTitle="No durations configured"
                    emptyDescription="Add rental duration periods to get started"
                />
            ) : (
                <div className="bg-white rounded-3xl shadow-sm p-12 border border-gray-200 py-4">
                    <div className="text-center">
                        <ClockIcon />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No durations configured</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Set up rental duration periods and pricing rules
                        </p>
                    </div>
                </div>
            )}

            <Modal
                title={editingDuration ? "Edit Rental Duration" : "Add Rental Duration"}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                size="md"
            >
                <Form method="post" className="space-y-4" onSubmit={handleCloseModal}>
                    <input type="hidden" name="intent" value={editingDuration ? "update" : "create"} />
                    {editingDuration && <input type="hidden" name="id" value={editingDuration.id} />}

                    <Input
                        label="Range Name"
                        name="rangeName"
                        value={formData.rangeName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, rangeName: e.target.value })}
                        placeholder="e.g., 1-3 days"
                        required
                    />

                    <Input
                        label="Min Days"
                        name="minDays"
                        type="number"
                        value={formData.minDays}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, minDays: e.target.value })}
                        placeholder="1"
                        required
                    />

                    <Input
                        label="Max Days (0 = unlimited)"
                        name="maxDays"
                        type="number"
                        value={formData.maxDays}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, maxDays: e.target.value })}
                        placeholder="0"
                    />

                    <Input
                        label="Price Multiplier"
                        name="priceMultiplier"
                        type="number"
                        step="0.01"
                        value={formData.priceMultiplier}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, priceMultiplier: e.target.value })}
                        placeholder="1"
                        required
                    />

                    <Input
                        label="Discount Label"
                        name="discountLabel"
                        value={formData.discountLabel}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, discountLabel: e.target.value })}
                        placeholder="e.g., -5%"
                    />

                    <div className="flex justify-end gap-3 pt-4">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={handleCloseModal}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary">
                            {editingDuration ? "Update Duration" : "Create Duration"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

function ClockIcon() {
    return (
        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    );
}
