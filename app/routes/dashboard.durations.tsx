import { type LoaderFunctionArgs, type ActionFunctionArgs, data, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { useState, useEffect } from "react";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import PageHeader from "~/components/dashboard/PageHeader";
import { TrashIcon, PlusIcon, PencilIcon, ClockIcon as HeroClockIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";

interface RentalDuration {
    id: number;
    rangeName: string;
    minDays: number;
    maxDays: number | null;
    priceMultiplier: number;
    discountLabel: string | null;
}

// Validate durations coverage - no gaps allowed
function validateDurationsCoverage(durations: Array<{minDays: number, maxDays: number | null}>): { valid: boolean, message?: string } {
    if (durations.length === 0) {
        return { valid: true };
    }

    // Sort by minDays
    const sorted = [...durations].sort((a, b) => a.minDays - b.minDays);
    
    // First duration must start at 1
    if (sorted[0].minDays !== 1) {
        return { valid: false, message: "First duration must start at day 1" };
    }
    
    // Check for gaps and overlaps
    for (let i = 0; i < sorted.length; i++) {
        const current = sorted[i];
        
        // Validate minDays > 0
        if (current.minDays < 1) {
            return { valid: false, message: "Min days must be at least 1" };
        }
        
        // Validate maxDays >= minDays (if maxDays is set)
        if (current.maxDays !== null && current.maxDays < current.minDays) {
            return { valid: false, message: "Max days must be greater than or equal to min days" };
        }
        
        // Check next duration
        if (i < sorted.length - 1) {
            const next = sorted[i + 1];
            
            // Current duration must have maxDays if not last
            if (current.maxDays === null) {
                return { valid: false, message: "Only the last duration can have unlimited max days" };
            }
            
            // Check for gap
            if (next.minDays !== current.maxDays + 1) {
                return { valid: false, message: `Gap detected: duration ends at day ${current.maxDays} but next starts at day ${next.minDays}` };
            }
        }
    }
    
    // Last duration should have maxDays = null (unlimited)
    const last = sorted[sorted.length - 1];
    if (last.maxDays !== null) {
        return { valid: false, message: "Last duration should have unlimited max days (0 or empty)" };
    }
    
    return { valid: true };
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    
    // Only admin can access durations page
    if (user.role !== "admin") {
        throw new Response("Access denied", { status: 403 });
    }
    
    const db = drizzle(context.cloudflare.env.DB, { schema });

    // Get all durations (global, not company-specific)
    const durations = await db
        .select()
        .from(schema.rentalDurations)
        .limit(100);

    return { user, durations };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    
    // Only admin can modify durations
    if (user.role !== "admin") {
        return data({ success: false, message: "Access denied" }, { status: 403 });
    }
    
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const id = Number(formData.get("id"));
        
        // Get all durations except the one being deleted
        const allDurations = await db.select().from(schema.rentalDurations);
        const remainingDurations = allDurations.filter(d => d.id !== id);
        
        // Validate coverage after deletion
        if (remainingDurations.length > 0) {
            const validation = validateDurationsCoverage(remainingDurations);
            if (!validation.valid) {
                return redirect(`/durations?error=${encodeURIComponent(validation.message!)}`);
            }
        }
        
        await db.delete(schema.rentalDurations).where(eq(schema.rentalDurations.id, id));
        return redirect("/durations?success=Duration deleted successfully");
    }

    if (intent === "create") {
        const rangeName = formData.get("rangeName") as string;
        const minDays = Number(formData.get("minDays"));
        const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        // Convert 0 to null for unlimited
        const normalizedMaxDays = maxDays === 0 ? null : maxDays;

        // Get existing durations
        const existingDurations = await db.select().from(schema.rentalDurations);
        
        // Add new duration to validation
        const allDurations = [
            ...existingDurations,
            { minDays, maxDays: normalizedMaxDays }
        ];
        
        const validation = validateDurationsCoverage(allDurations);
        if (!validation.valid) {
            return redirect(`/durations?error=${encodeURIComponent(validation.message!)}`);
        }

        await db.insert(schema.rentalDurations).values({
            rangeName,
            minDays,
            maxDays: normalizedMaxDays,
            priceMultiplier,
            discountLabel: discountLabel || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return redirect("/durations?success=Duration created successfully");
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const rangeName = formData.get("rangeName") as string;
        const minDays = Number(formData.get("minDays"));
        const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        // Convert 0 to null for unlimited
        const normalizedMaxDays = maxDays === 0 ? null : maxDays;

        // Get all durations except the one being updated
        const allDurations = await db.select().from(schema.rentalDurations);
        const otherDurations = allDurations.filter(d => d.id !== id);
        
        // Add updated duration to validation
        const durationsToValidate = [
            ...otherDurations,
            { minDays, maxDays: normalizedMaxDays }
        ];
        
        const validation = validateDurationsCoverage(durationsToValidate);
        if (!validation.valid) {
            return redirect(`/durations?error=${encodeURIComponent(validation.message!)}`);
        }

        await db
            .update(schema.rentalDurations)
            .set({
                rangeName,
                minDays,
                maxDays: normalizedMaxDays,
                priceMultiplier,
                discountLabel: discountLabel || null,
                updatedAt: new Date(),
            })
            .where(eq(schema.rentalDurations.id, id));

        return redirect("/durations?success=Duration updated successfully");
    }

    if (intent === "seed") {
        // Insert default durations
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
                ...duration,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        return redirect("/durations?success=Default durations created successfully");
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function DurationsPage() {
    const { user, durations } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDuration, setEditingDuration] = useState<RentalDuration | null>(null);
    const [formData, setFormData] = useState({
        rangeName: "",
        minDays: "",
        maxDays: "",
        priceMultiplier: "1",
        discountLabel: "",
    });

    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        
        if (success) {
            showToast(success, "success");
        }
        if (error) {
            showToast(error, "error");
        }
    }, [searchParams, showToast]);

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
                            Add
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
                <div className="bg-white rounded-3xl shadow-sm p-12 py-4">
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
        <HeroClockIcon className="w-16 h-16 mx-auto text-gray-400" />
    );
}
