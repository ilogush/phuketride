import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq, and } from "drizzle-orm";
import { useState } from "react";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import Modal from "~/components/dashboard/Modal";
import { Input } from "~/components/dashboard/Input";
import PageHeader from "~/components/dashboard/PageHeader";
import { PlusIcon } from "@heroicons/react/24/outline";


interface Season {
    id: number;
    companyId: number;
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

    const companyId = user.companyId || 1;

    const seasons = await db
        .select()
        .from(schema.seasons)
        .where(eq(schema.seasons.companyId, companyId))
        .limit(100);

    return { user, seasons, companyId };
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

    const companyId = user.companyId || 1;

    if (intent === "delete") {
        const id = Number(formData.get("id"));

        await db
            .delete(schema.seasons)
            .where(
                and(
                    eq(schema.seasons.id, id),
                    eq(schema.seasons.companyId, companyId)
                )
            );

        return data({ success: true, message: "Season deleted successfully" });
    }

    if (intent === "create") {
        const seasonName = formData.get("seasonName") as string;
        const startMonth = Number(formData.get("startMonth"));
        const startDay = Number(formData.get("startDay"));
        const endMonth = Number(formData.get("endMonth"));
        const endDay = Number(formData.get("endDay"));
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        await db.insert(schema.seasons).values({
            companyId,
            seasonName,
            startMonth,
            startDay,
            endMonth,
            endDay,
            priceMultiplier,
            discountLabel: discountLabel || null,
        });

        return data({ success: true, message: "Season created successfully" });
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
            })
            .where(
                and(
                    eq(schema.seasons.id, id),
                    eq(schema.seasons.companyId, companyId)
                )
            );

        return data({ success: true, message: "Season updated successfully" });
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
                companyId,
                ...season,
            });
        }

        return data({ success: true, message: "Default seasons created successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function SeasonsPage() {
    const { seasons } = useLoaderData<typeof loader>();
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
        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
    );
}
