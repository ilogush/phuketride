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
import { PlusIcon, SunIcon } from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";


interface Season {
    id: number;
    seasonName: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    priceMultiplier: number;
    discountLabel: string | null;
}

const MONTHS = [
    { value: "1", label: "Jan" },
    { value: "2", label: "Feb" },
    { value: "3", label: "Mar" },
    { value: "4", label: "Apr" },
    { value: "5", label: "May" },
    { value: "6", label: "Jun" },
    { value: "7", label: "Jul" },
    { value: "8", label: "Aug" },
    { value: "9", label: "Sep" },
    { value: "10", label: "Oct" },
    { value: "11", label: "Nov" },
    { value: "12", label: "Dec" },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
    value: String(i + 1),
    label: String(i + 1),
}));

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    
    // Only admin can access seasons page
    if (user.role !== "admin") {
        throw new Response("Access denied", { status: 403 });
    }
    
    const db = drizzle(context.cloudflare.env.DB, { schema });

    // Get all seasons (global, not company-specific)
    const seasons = await db
        .select()
        .from(schema.seasons)
        .limit(100);

    return { user, seasons };
}

// Helper function to get day of year from month/day
function getDayOfYear(month: number, day: number): number {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let dayOfYear = day;
    for (let i = 0; i < month - 1; i++) {
        dayOfYear += daysInMonth[i];
    }
    return dayOfYear;
}

// Helper function to validate date exists
function isValidDate(month: number, day: number): boolean {
    const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1];
}

// Helper function to get all days covered by a season
function getSeasonDays(startMonth: number, startDay: number, endMonth: number, endDay: number): Set<number> {
    const days = new Set<number>();
    const startDayOfYear = getDayOfYear(startMonth, startDay);
    const endDayOfYear = getDayOfYear(endMonth, endDay);
    
    if (startDayOfYear <= endDayOfYear) {
        // Normal range within same year
        for (let i = startDayOfYear; i <= endDayOfYear; i++) {
            days.add(i);
        }
    } else {
        // Wraps around year end (e.g., Dec 20 - Jan 20)
        for (let i = startDayOfYear; i <= 366; i++) {
            days.add(i);
        }
        for (let i = 1; i <= endDayOfYear; i++) {
            days.add(i);
        }
    }
    
    return days;
}

// Validate seasons coverage
function validateSeasonsCoverage(seasons: Array<{startMonth: number, startDay: number, endMonth: number, endDay: number}>): { valid: boolean, message?: string } {
    // Check for overlaps
    for (let i = 0; i < seasons.length; i++) {
        const season1Days = getSeasonDays(seasons[i].startMonth, seasons[i].startDay, seasons[i].endMonth, seasons[i].endDay);
        
        for (let j = i + 1; j < seasons.length; j++) {
            const season2Days = getSeasonDays(seasons[j].startMonth, seasons[j].startDay, seasons[j].endMonth, seasons[j].endDay);
            
            // Check for overlap
            for (const day of season1Days) {
                if (season2Days.has(day)) {
                    return { valid: false, message: "Seasons overlap detected. Each day must belong to only one season" };
                }
            }
        }
    }
    
    // Check for gaps (all 366 days must be covered)
    const allCoveredDays = new Set<number>();
    for (const season of seasons) {
        const seasonDays = getSeasonDays(season.startMonth, season.startDay, season.endMonth, season.endDay);
        seasonDays.forEach(day => allCoveredDays.add(day));
    }
    
    if (allCoveredDays.size < 365) {
        return { valid: false, message: "All days of the year must be covered by seasons. Found gaps in coverage" };
    }
    
    return { valid: true };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    
    // Only admin can modify seasons
    if (user.role !== "admin") {
        return data({ success: false, message: "Access denied" }, { status: 403 });
    }
    
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (intent === "delete") {
        const id = Number(formData.get("id"));
        
        // Get all seasons except the one being deleted
        const allSeasons = await db.select().from(schema.seasons);
        const remainingSeasons = allSeasons.filter(s => s.id !== id);
        
        // Validate coverage after deletion
        if (remainingSeasons.length > 0) {
            const validation = validateSeasonsCoverage(remainingSeasons);
            if (!validation.valid) {
                return redirect(`/seasons?error=${encodeURIComponent(validation.message!)}`);
            }
        }
        
        await db.delete(schema.seasons).where(eq(schema.seasons.id, id));
        return redirect("/seasons?success=Season deleted successfully");
    }

    if (intent === "create") {
        const seasonName = formData.get("seasonName") as string;
        const startMonth = Number(formData.get("startMonth"));
        const startDay = Number(formData.get("startDay"));
        const endMonth = Number(formData.get("endMonth"));
        const endDay = Number(formData.get("endDay"));
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        // Validate dates exist
        if (!isValidDate(startMonth, startDay)) {
            return redirect("/seasons?error=Invalid start date");
        }
        if (!isValidDate(endMonth, endDay)) {
            return redirect("/seasons?error=Invalid end date");
        }

        // Get existing seasons
        const existingSeasons = await db.select().from(schema.seasons);
        
        // Add new season to validation
        const allSeasons = [
            ...existingSeasons,
            { startMonth, startDay, endMonth, endDay }
        ];
        
        const validation = validateSeasonsCoverage(allSeasons);
        if (!validation.valid) {
            return redirect(`/seasons?error=${encodeURIComponent(validation.message!)}`);
        }

        await db.insert(schema.seasons).values({
            seasonName,
            startMonth,
            startDay,
            endMonth,
            endDay,
            priceMultiplier,
            discountLabel: discountLabel || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return redirect("/seasons?success=Season created successfully");
    }

    if (intent === "update") {
        const id = Number(formData.get("id"));
        const seasonName = formData.get("seasonName") as string;
        const startMonth = Number(formData.get("startMonth"));
        const startDay = Number(formData.get("startDay"));
        const endMonth = Number(formData.get("endMonth"));
        const endDay = Number(formData.get("endDay"));
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        // Validate dates exist
        if (!isValidDate(startMonth, startDay)) {
            return redirect("/seasons?error=Invalid start date");
        }
        if (!isValidDate(endMonth, endDay)) {
            return redirect("/seasons?error=Invalid end date");
        }

        // Get all seasons except the one being updated
        const existingSeasons = await db.select().from(schema.seasons);
        const otherSeasons = existingSeasons.filter(s => s.id !== id);
        
        // Add updated season to validation
        const allSeasons = [
            ...otherSeasons,
            { startMonth, startDay, endMonth, endDay }
        ];
        
        const validation = validateSeasonsCoverage(allSeasons);
        if (!validation.valid) {
            return redirect(`/seasons?error=${encodeURIComponent(validation.message!)}`);
        }

        await db
            .update(schema.seasons)
            .set({
                seasonName,
                startMonth,
                startDay,
                endMonth,
                endDay,
                priceMultiplier,
                discountLabel: discountLabel || null,
                updatedAt: new Date(),
            })
            .where(eq(schema.seasons.id, id));

        return redirect("/seasons?success=Season updated successfully");
    }

    if (intent === "seed") {
        const defaultSeasons = [
            { seasonName: "Peak Season", startMonth: 12, startDay: 20, endMonth: 1, endDay: 20, priceMultiplier: 1.5, discountLabel: "+50%" },
            { seasonName: "High Season", startMonth: 1, startDay: 21, endMonth: 5, endDay: 5, priceMultiplier: 1.3, discountLabel: "+30%" },
            { seasonName: "Low Season", startMonth: 5, startDay: 6, endMonth: 10, endDay: 20, priceMultiplier: 1, discountLabel: "Base" },
            { seasonName: "Shoulder Season", startMonth: 10, startDay: 21, endMonth: 12, endDay: 19, priceMultiplier: 1.1, discountLabel: "+10%" },
        ];

        for (const season of defaultSeasons) {
            await db.insert(schema.seasons).values({
                ...season,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        return redirect("/seasons?success=Default seasons created successfully");
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function SeasonsPage() {
    const { seasons } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const { showToast } = useToast();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSeason, setEditingSeason] = useState<Season | null>(null);
    const [formData, setFormData] = useState({
        seasonName: "",
        startMonth: "12",
        startDay: "1",
        endMonth: "1",
        endDay: "31",
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

    const handleEdit = (season: Season) => {
        setEditingSeason(season);
        setFormData({
            seasonName: season.seasonName,
            startMonth: String(season.startMonth),
            startDay: String(season.startDay),
            endMonth: String(season.endMonth),
            endDay: String(season.endDay),
            priceMultiplier: String(season.priceMultiplier),
            discountLabel: season.discountLabel || "",
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingSeason(null);
        setFormData({
            seasonName: "",
            startMonth: "12",
            startDay: "1",
            endMonth: "1",
            endDay: "31",
            priceMultiplier: "1",
            discountLabel: "",
        });
    };

    const columns: Column<Season>[] = [
        {
            key: "seasonName",
            label: "Season Name",
            render: (item) => (
                <span className="font-medium text-gray-900">{item.seasonName}</span>
            ),
        },
        {
            key: "startDate",
            label: "Start Date",
            render: (item) => (
                <span className="text-gray-700">
                    {MONTHS[item.startMonth - 1]?.label} {item.startDay}
                </span>
            ),
        },
        {
            key: "endDate",
            label: "End Date",
            render: (item) => (
                <span className="text-gray-700">
                    {MONTHS[item.endMonth - 1]?.label} {item.endDay}
                </span>
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
                title="Seasons"
                rightActions={
                    <div className="flex gap-3">
                        {seasons.length === 0 && (
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

            {seasons.length > 0 ? (
                <DataTable
                    columns={columns}
                    data={seasons}
                    disablePagination={true}
                    emptyTitle="No seasons configured"
                    emptyDescription="Addal pricing periods to get started"
                />
            ) : (
                <div className="bg-white rounded-3xl shadow-sm p-12 py-4">
                    <div className="text-center">
                        <SeasonIcon />
                        <h3 className="mt-4 text-lg font-medium text-gray-900">No seasons configured</h3>
                        <p className="mt-2 text-sm text-gray-500">
                            Define seasonal pricing periods for your rental business
                        </p>
                    </div>
                </div>
            )}

            <Modal
                title={editingSeason ? "Edit Season" : "Add"}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                size="md"
            >
                <Form method="post" className="space-y-4" onSubmit={handleCloseModal}>
                    <input type="hidden" name="intent" value={editingSeason ? "update" : "create"} />
                    {editingSeason && <input type="hidden" name="id" value={editingSeason.id} />}

                    <Input
                        label="Season Name"
                        name="seasonName"
                        value={formData.seasonName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, seasonName: e.target.value })}
                        placeholder="e.g., Peak Season"
                        required
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">
                                Start Month
                            </label>
                            <select
                                name="startMonth"
                                value={formData.startMonth}
                                onChange={(e) => setFormData({ ...formData, startMonth: e.target.value })}
                                className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                                required
                            >
                                {MONTHS.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">
                                Start Day
                            </label>
                            <select
                                name="startDay"
                                value={formData.startDay}
                                onChange={(e) => setFormData({ ...formData, startDay: e.target.value })}
                                className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                                required
                            >
                                {DAYS.map((day) => (
                                    <option key={day.value} value={day.value}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">
                                End Month
                            </label>
                            <select
                                name="endMonth"
                                value={formData.endMonth}
                                onChange={(e) => setFormData({ ...formData, endMonth: e.target.value })}
                                className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                                required
                            >
                                {MONTHS.map((month) => (
                                    <option key={month.value} value={month.value}>
                                        {month.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs text-gray-600 mb-1">
                                End Day
                            </label>
                            <select
                                name="endDay"
                                value={formData.endDay}
                                onChange={(e) => setFormData({ ...formData, endDay: e.target.value })}
                                className="w-full px-4 py-2 text-gray-500 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-800 focus:border-transparent"
                                required
                            >
                                {DAYS.map((day) => (
                                    <option key={day.value} value={day.value}>
                                        {day.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

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
                        placeholder="e.g., +50%"
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
                            {editingSeason ? "Update Season" : "Create Season"}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

function SeasonIcon() {
    return (
        <SunIcon className="w-10 h-10 mx-auto text-gray-400" />
    );
}
