import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAdmin, requireAuth } from "~/lib/auth.server";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Button from "~/components/dashboard/Button";
import { Input } from "~/components/dashboard/Input";
import AdminCrudModalPage from "~/components/dashboard/AdminCrudModalPage";
import { PlusIcon, SunIcon } from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { useCrudModal } from "~/lib/useCrudModal";
import { handleSeasonsAction } from "~/lib/seasons-actions.server";


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
    const user = await requireAdmin(request);

    // Get all seasons (global, not company-specific)
    const seasonsResult = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                id,
                season_name AS seasonName,
                start_month AS startMonth,
                start_day AS startDay,
                end_month AS endMonth,
                end_day AS endDay,
                price_multiplier AS priceMultiplier,
                discount_label AS discountLabel
            FROM seasons
            ORDER BY id ASC
            LIMIT ${QUERY_LIMITS.LARGE}
        `)
        .all() as { results?: Season[] };
    const seasons = seasonsResult.results || [];

    return { user, seasons };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);

    // Only admin can modify seasons
    if (user.role !== "admin") {
        return data({ success: false, message: "Access denied" }, { status: 403 });
    }

    const formData = await request.formData();
    return handleSeasonsAction({ context, formData });
}

export default function SeasonsPage() {
    const { seasons } = useLoaderData<typeof loader>();
    useUrlToast();
    const {
        isModalOpen,
        editingEntity: editingSeason,
        formData,
        setFormData,
        openCreateModal,
        openEditModal,
        closeModal,
    } = useCrudModal<Season, {
        seasonName: string;
        startMonth: string;
        startDay: string;
        endMonth: string;
        endDay: string;
        priceMultiplier: string;
        discountLabel: string;
    }>({
        initialFormData: {
            seasonName: "",
            startMonth: "12",
            startDay: "1",
            endMonth: "1",
            endDay: "31",
            priceMultiplier: "1",
            discountLabel: "",
        },
        mapEntityToFormData: (season) => ({
            seasonName: season.seasonName,
            startMonth: String(season.startMonth),
            startDay: String(season.startDay),
            endMonth: String(season.endMonth),
            endDay: String(season.endDay),
            priceMultiplier: String(season.priceMultiplier),
            discountLabel: season.discountLabel || "",
        }),
    });

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
                        onClick={() => openEditModal(item)}
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
        <AdminCrudModalPage
            title="Seasons"
            addLabel="Add"
            onAdd={openCreateModal}
            headerExtras={
                seasons.length === 0 ? (
                    <Form method="post">
                        <input type="hidden" name="intent" value="seed" />
                        <Button type="submit" variant="secondary">
                            Load Default Data
                        </Button>
                    </Form>
                ) : null
            }
            tableContent={
                seasons.length > 0 ? (
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
                )
            }
            modalTitle={editingSeason ? "Edit Season" : "Add"}
            isModalOpen={isModalOpen}
            onCloseModal={closeModal}
            formIntent={editingSeason ? "update" : "create"}
            editingId={editingSeason?.id}
            onFormSubmit={closeModal}
            submitLabel={editingSeason ? "Update Season" : "Create Season"}
            formChildren={
                <>
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
                </>
            }
        />
    );
}

function SeasonIcon() {
    return (
        <SunIcon className="w-10 h-10 mx-auto text-gray-400" />
    );
}
