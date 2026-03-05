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
import { redirectWithError, redirectWithSuccess } from "~/lib/route-feedback";
import { parseFormIntent, runMutationWithFeedback } from "~/lib/admin-actions";


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
type SeasonCoverageRow = {
    id?: number;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
};

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
function validateSeasonsCoverage(seasons: Array<{ startMonth: number, startDay: number, endMonth: number, endDay: number }>): { valid: boolean, message?: string } {
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

    const formData = await request.formData();
    const intentParsed = parseFormIntent(formData, ["delete", "create", "update", "seed"], "Invalid action");
    if (!intentParsed.ok) {
        return data({ success: false, message: "Invalid action" }, { status: 400 });
    }
    const intent = intentParsed.data.intent;

    if (intent === "delete") {
        const id = Number(formData.get("id"));

        // Get all seasons except the one being deleted
        const allSeasonsResult = await context.cloudflare.env.DB
            .prepare(`
                SELECT id, start_month AS startMonth, start_day AS startDay, end_month AS endMonth, end_day AS endDay
                FROM seasons
            `)
            .all() as { results?: SeasonCoverageRow[] };
        const allSeasons = allSeasonsResult.results || [];
        const remainingSeasons = allSeasons.filter(s => s.id !== id);

        // Validate coverage after deletion
        if (remainingSeasons.length > 0) {
            const validation = validateSeasonsCoverage(remainingSeasons);
            if (!validation.valid) {
                return redirectWithError("/seasons", validation.message || "Invalid seasons coverage");
            }
        }

        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare("DELETE FROM seasons WHERE id = ?")
                    .bind(id)
                    .run();
            },
            {
                successPath: "/seasons",
                successMessage: "Season deleted successfully",
                errorMessage: "Failed to delete season",
            }
        );
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
            return redirectWithError("/seasons", "Invalid start date");
        }
        if (!isValidDate(endMonth, endDay)) {
            return redirectWithError("/seasons", "Invalid end date");
        }

        // Get existing seasons
        const existingSeasonsResult = await context.cloudflare.env.DB
            .prepare("SELECT start_month AS startMonth, start_day AS startDay, end_month AS endMonth, end_day AS endDay FROM seasons")
            .all() as { results?: SeasonCoverageRow[] };
        const existingSeasons = existingSeasonsResult.results || [];

        // Add new season to validation
        const allSeasons = [
            ...existingSeasons,
            { startMonth, startDay, endMonth, endDay }
        ];

        const validation = validateSeasonsCoverage(allSeasons);
        if (!validation.valid) {
            return redirectWithError("/seasons", validation.message || "Invalid seasons coverage");
        }

        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare(`
                        INSERT INTO seasons (
                            season_name, start_month, start_day, end_month, end_day,
                            price_multiplier, discount_label, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `)
                    .bind(
                        seasonName,
                        startMonth,
                        startDay,
                        endMonth,
                        endDay,
                        priceMultiplier,
                        discountLabel || null,
                        new Date().toISOString(),
                        new Date().toISOString()
                    )
                    .run();
            },
            {
                successPath: "/seasons",
                successMessage: "Season created successfully",
                errorMessage: "Failed to create season",
            }
        );
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
            return redirectWithError("/seasons", "Invalid start date");
        }
        if (!isValidDate(endMonth, endDay)) {
            return redirectWithError("/seasons", "Invalid end date");
        }

        // Get all seasons except the one being updated
        const existingSeasonsResult = await context.cloudflare.env.DB
            .prepare(`
                SELECT id, start_month AS startMonth, start_day AS startDay, end_month AS endMonth, end_day AS endDay
                FROM seasons
            `)
            .all() as { results?: SeasonCoverageRow[] };
        const existingSeasons = existingSeasonsResult.results || [];
        const otherSeasons = existingSeasons.filter(s => s.id !== id);

        // Add updated season to validation
        const allSeasons = [
            ...otherSeasons,
            { startMonth, startDay, endMonth, endDay }
        ];

        const validation = validateSeasonsCoverage(allSeasons);
        if (!validation.valid) {
            return redirectWithError("/seasons", validation.message || "Invalid seasons coverage");
        }

        return runMutationWithFeedback(
            async () => {
                await context.cloudflare.env.DB
                    .prepare(`
                        UPDATE seasons
                        SET season_name = ?, start_month = ?, start_day = ?, end_month = ?, end_day = ?,
                            price_multiplier = ?, discount_label = ?, updated_at = ?
                        WHERE id = ?
                    `)
                    .bind(
                        seasonName,
                        startMonth,
                        startDay,
                        endMonth,
                        endDay,
                        priceMultiplier,
                        discountLabel || null,
                        new Date().toISOString(),
                        id
                    )
                    .run();
            },
            {
                successPath: "/seasons",
                successMessage: "Season updated successfully",
                errorMessage: "Failed to update season",
            }
        );
    }

    if (intent === "seed") {
        const defaultSeasons = [
            { seasonName: "Peak Season", startMonth: 12, startDay: 20, endMonth: 1, endDay: 20, priceMultiplier: 1.5, discountLabel: "+50%" },
            { seasonName: "High Season", startMonth: 1, startDay: 21, endMonth: 5, endDay: 5, priceMultiplier: 1.3, discountLabel: "+30%" },
            { seasonName: "Low Season", startMonth: 5, startDay: 6, endMonth: 10, endDay: 20, priceMultiplier: 1, discountLabel: "Base" },
            { seasonName: "Shoulder Season", startMonth: 10, startDay: 21, endMonth: 12, endDay: 19, priceMultiplier: 1.1, discountLabel: "+10%" },
        ];

        return runMutationWithFeedback(
            async () => {
                for (const season of defaultSeasons) {
                    await context.cloudflare.env.DB
                        .prepare(`
                            INSERT INTO seasons (
                                season_name, start_month, start_day, end_month, end_day,
                                price_multiplier, discount_label, created_at, updated_at
                            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                        `)
                        .bind(
                            season.seasonName,
                            season.startMonth,
                            season.startDay,
                            season.endMonth,
                            season.endDay,
                            season.priceMultiplier,
                            season.discountLabel,
                            new Date().toISOString(),
                            new Date().toISOString()
                        )
                        .run();
                }
            },
            {
                successPath: "/seasons",
                successMessage: "Default seasons created successfully",
                errorMessage: "Failed to create default seasons",
            }
        );
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
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
