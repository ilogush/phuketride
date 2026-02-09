import { type LoaderFunctionArgs, type ActionFunctionArgs, data } from "react-router";
import { useLoaderData, Form, useRevalidator } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import WeeklySchedule from "~/components/dashboard/WeeklySchedule";
import HolidaysManager from "~/components/dashboard/HolidaysManager";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Modal from "~/components/dashboard/Modal";
import { useState } from "react";
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    Cog6ToothIcon,
    ClockIcon,
    SunIcon,
    CurrencyDollarIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";

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
    const db = drizzle(context.cloudflare.env.DB, { schema });

    if (!user.companyId) {
        throw new Response("Company not found", { status: 404 });
    }

    const [company, locations, districts, seasons, durations] = await Promise.all([
        db.select().from(schema.companies).where(eq(schema.companies.id, user.companyId)).limit(1),
        db.select().from(schema.locations).limit(100),
        db.select().from(schema.districts).limit(200),
        db.select().from(schema.seasons).where(eq(schema.seasons.companyId, user.companyId)).limit(100),
        db.select().from(schema.rentalDurations).where(eq(schema.rentalDurations.companyId, user.companyId)).limit(100),
    ]);

    if (!company || company.length === 0) {
        throw new Response("Company not found", { status: 404 });
    }

    return { user, company: company[0], locations, districts, seasons, durations };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");

    if (!user.companyId) {
        return data({ success: false, message: "Company not found" }, { status: 404 });
    }

    if (intent === "updateGeneral") {
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const telegram = formData.get("telegram") as string;
        const locationId = Number(formData.get("locationId"));
        const districtId = Number(formData.get("districtId"));
        const street = formData.get("street") as string;
        const houseNumber = formData.get("houseNumber") as string;
        const bankName = formData.get("bankName") as string;
        const accountNumber = formData.get("accountNumber") as string;
        const accountName = formData.get("accountName") as string;
        const swiftCode = formData.get("swiftCode") as string;
        const preparationTime = Number(formData.get("preparationTime")) || 30;
        const deliveryFeeAfterHours = Number(formData.get("deliveryFeeAfterHours")) || 0;
        const islandTripPrice = Number(formData.get("islandTripPrice")) || 0;
        const krabiTripPrice = Number(formData.get("krabiTripPrice")) || 0;
        const babySeatPricePerDay = Number(formData.get("babySeatPricePerDay")) || 0;
        const weeklySchedule = formData.get("weeklySchedule") as string;
        const holidays = formData.get("holidays") as string;

        await db.update(schema.companies)
            .set({
                name,
                email,
                phone,
                telegram,
                locationId,
                districtId,
                street,
                houseNumber,
                bankName,
                accountNumber,
                accountName,
                swiftCode,
                preparationTime,
                deliveryFeeAfterHours,
                islandTripPrice,
                krabiTripPrice,
                babySeatPricePerDay,
                weeklySchedule,
                holidays,
                updatedAt: new Date(),
            })
            .where(eq(schema.companies.id, user.companyId));

        return data({ success: true, message: "Settings updated successfully" });
    }

    // Seasons actions
    if (intent === "createSeason") {
        const seasonName = formData.get("seasonName") as string;
        const startMonth = Number(formData.get("startMonth"));
        const startDay = Number(formData.get("startDay"));
        const endMonth = Number(formData.get("endMonth"));
        const endDay = Number(formData.get("endDay"));
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        await db.insert(schema.seasons).values({
            companyId: user.companyId,
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

    if (intent === "updateSeason") {
        const id = Number(formData.get("id"));
        const seasonName = formData.get("seasonName") as string;
        const startMonth = Number(formData.get("startMonth"));
        const startDay = Number(formData.get("startDay"));
        const endMonth = Number(formData.get("endMonth"));
        const endDay = Number(formData.get("endDay"));
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        await db.update(schema.seasons)
            .set({
                seasonName,
                startMonth,
                startDay,
                endMonth,
                endDay,
                priceMultiplier,
                discountLabel: discountLabel || null,
            })
            .where(and(eq(schema.seasons.id, id), eq(schema.seasons.companyId, user.companyId)));

        return data({ success: true, message: "Season updated successfully" });
    }

    if (intent === "deleteSeason") {
        const id = Number(formData.get("id"));
        await db.delete(schema.seasons)
            .where(and(eq(schema.seasons.id, id), eq(schema.seasons.companyId, user.companyId)));

        return data({ success: true, message: "Season deleted successfully" });
    }

    // Durations actions
    if (intent === "createDuration") {
        const rangeName = formData.get("rangeName") as string;
        const minDays = Number(formData.get("minDays"));
        const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        await db.insert(schema.rentalDurations).values({
            companyId: user.companyId,
            rangeName,
            minDays,
            maxDays,
            priceMultiplier,
            discountLabel: discountLabel || null,
        });

        return data({ success: true, message: "Duration created successfully" });
    }

    if (intent === "updateDuration") {
        const id = Number(formData.get("id"));
        const rangeName = formData.get("rangeName") as string;
        const minDays = Number(formData.get("minDays"));
        const maxDays = formData.get("maxDays") ? Number(formData.get("maxDays")) : null;
        const priceMultiplier = Number(formData.get("priceMultiplier"));
        const discountLabel = formData.get("discountLabel") as string | null;

        await db.update(schema.rentalDurations)
            .set({
                rangeName,
                minDays,
                maxDays,
                priceMultiplier,
                discountLabel: discountLabel || null,
            })
            .where(and(eq(schema.rentalDurations.id, id), eq(schema.rentalDurations.companyId, user.companyId)));

        return data({ success: true, message: "Duration updated successfully" });
    }

    if (intent === "deleteDuration") {
        const id = Number(formData.get("id"));
        await db.delete(schema.rentalDurations)
            .where(and(eq(schema.rentalDurations.id, id), eq(schema.rentalDurations.companyId, user.companyId)));

        return data({ success: true, message: "Duration deleted successfully" });
    }

    return data({ success: false, message: "Invalid action" }, { status: 400 });
}

export default function SettingsPage() {
    const { company, locations, districts, seasons, durations } = useLoaderData<typeof loader>();
    const [activeTab, setActiveTab] = useState<string | number>("general");
    const [selectedLocationId, setSelectedLocationId] = useState(company.locationId);
    const [weeklySchedule, setWeeklySchedule] = useState(company.weeklySchedule || "");
    const [holidays, setHolidays] = useState(company.holidays || "");
    const [isSeasonModalOpen, setIsSeasonModalOpen] = useState(false);
    const [editingSeason, setEditingSeason] = useState<any | null>(null);
    const [seasonFormData, setSeasonFormData] = useState({
        seasonName: "",
        startMonth: "12",
        startDay: "1",
        endMonth: "1",
        endDay: "31",
        priceMultiplier: "1",
        discountLabel: "",
    });
    const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
    const [editingDuration, setEditingDuration] = useState<any | null>(null);
    const [durationFormData, setDurationFormData] = useState({
        rangeName: "",
        minDays: "1",
        maxDays: "",
        priceMultiplier: "1",
        discountLabel: "",
    });
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState<any | null>(null);
    const [paymentFormData, setPaymentFormData] = useState({
        name: "",
        sign: "+",
        description: "",
    });
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const [currencies, setCurrencies] = useState([
        { id: 1, name: "Thai Baht", code: "THB", symbol: "฿", isActive: true, isDefault: true },
        { id: 2, name: "US Dollar", code: "USD", symbol: "$", isActive: true, isDefault: false },
        { id: 3, name: "Euro", code: "EUR", symbol: "€", isActive: false, isDefault: false },
        { id: 7, name: "Russian Ruble", code: "RUB", symbol: "₽", isActive: false, isDefault: false },
    ]);
    const toast = useToast();
    const revalidator = useRevalidator();

    const tabs = [
        { id: "general", label: "General" },
        { id: "seasons", label: "Seasons" },
        { id: "durations", label: "Durations" },
        { id: "payments", label: "Payments" },
        { id: "currencies", label: "Currencies" },
    ];

    const filteredDistricts = districts.filter(d => d.locationId === selectedLocationId);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        
        try {
            const response = await fetch(form.action, {
                method: form.method,
                body: formData,
            });
            
            if (response.ok) {
                toast.success("Settings updated successfully");
            } else {
                toast.error("Failed to update settings");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleSeasonSubmit = () => {
        revalidator.revalidate();
        setIsSeasonModalOpen(false);
        setEditingSeason(null);
        toast.success(editingSeason ? "Season updated" : "Season created");
    };

    const handleDurationSubmit = () => {
        revalidator.revalidate();
        setIsDurationModalOpen(false);
        setEditingDuration(null);
        toast.success(editingDuration ? "Duration updated" : "Duration created");
    };

    const seasonColumns: Column<any>[] = [
        {
            key: "seasonName",
            label: "Season Name",
            render: (item) => <span className="font-medium text-gray-900">{item.seasonName}</span>,
        },
        {
            key: "startDate",
            label: "Start Date",
            render: (item) => <span className="text-gray-700">{MONTHS[item.startMonth - 1]?.label} {item.startDay}</span>,
        },
        {
            key: "endDate",
            label: "End Date",
            render: (item) => <span className="text-gray-700">{MONTHS[item.endMonth - 1]?.label} {item.endDay}</span>,
        },
        {
            key: "priceMultiplier",
            label: "Price Multiplier",
            render: (item) => <span className="text-gray-700">{item.priceMultiplier}</span>,
        },
        {
            key: "discountLabel",
            label: "Discount Label",
            render: (item) => <span className="text-gray-600">{item.discountLabel || "-"}</span>,
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
                        onClick={() => {
                            setEditingSeason(item);
                            setSeasonFormData({
                                seasonName: item.seasonName,
                                startMonth: String(item.startMonth),
                                startDay: String(item.startDay),
                                endMonth: String(item.endMonth),
                                endDay: String(item.endDay),
                                priceMultiplier: String(item.priceMultiplier),
                                discountLabel: item.discountLabel || "",
                            });
                            setIsSeasonModalOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Form method="post" onSubmit={() => { revalidator.revalidate(); toast.success("Season deleted"); }}>
                        <input type="hidden" name="intent" value="deleteSeason" />
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" variant="secondary" size="sm">Delete</Button>
                    </Form>
                </div>
            ),
        },
    ];

    const durationColumns: Column<any>[] = [
        {
            key: "rangeName",
            label: "Range Name",
            render: (item) => <span className="font-medium text-gray-900">{item.rangeName}</span>,
        },
        {
            key: "minDays",
            label: "Min Days",
            render: (item) => <span className="text-gray-700">{item.minDays}</span>,
        },
        {
            key: "maxDays",
            label: "Max Days",
            render: (item) => <span className="text-gray-700">{item.maxDays || "Unlimited"}</span>,
        },
        {
            key: "priceMultiplier",
            label: "Price Multiplier",
            render: (item) => <span className="text-gray-700">{item.priceMultiplier}</span>,
        },
        {
            key: "discountLabel",
            label: "Discount Label",
            render: (item) => <span className="text-gray-600">{item.discountLabel || "-"}</span>,
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
                        onClick={() => {
                            setEditingDuration(item);
                            setDurationFormData({
                                rangeName: item.rangeName,
                                minDays: String(item.minDays),
                                maxDays: item.maxDays ? String(item.maxDays) : "",
                                priceMultiplier: String(item.priceMultiplier),
                                discountLabel: item.discountLabel || "",
                            });
                            setIsDurationModalOpen(true);
                        }}
                    >
                        Edit
                    </Button>
                    <Form method="post" onSubmit={() => { revalidator.revalidate(); toast.success("Duration deleted"); }}>
                        <input type="hidden" name="intent" value="deleteDuration" />
                        <input type="hidden" name="id" value={item.id} />
                        <Button type="submit" variant="secondary" size="sm">Delete</Button>
                    </Form>
                </div>
            ),
        },
    ];

    const handleToggleCurrency = (id: number, field: 'isActive' | 'isDefault') => {
        setCurrencies(prev => prev.map(curr => {
            if (field === 'isDefault' && curr.id === id) {
                return { ...curr, isDefault: true };
            }
            if (field === 'isDefault' && curr.id !== id) {
                return { ...curr, isDefault: false };
            }
            if (field === 'isActive' && curr.id === id) {
                return { ...curr, isActive: !curr.isActive };
            }
            return curr;
        }));
        toast.success(field === 'isActive' ? 'Currency status updated' : 'Default currency updated');
    };

    const getHeaderActions = () => {
        if (activeTab === "general") {
            return (
                <Button type="submit" variant="primary" form="settings-form">
                    Save
                </Button>
            );
        }
        if (activeTab === "seasons") {
            return (
                <Button
                    variant="primary"
                    icon={<PlusIcon className="w-5 h-5" />}
                    onClick={() => {
                        setEditingSeason(null);
                        setSeasonFormData({
                            seasonName: "",
                            startMonth: "12",
                            startDay: "1",
                            endMonth: "1",
                            endDay: "31",
                            priceMultiplier: "1",
                            discountLabel: "",
                        });
                        setIsSeasonModalOpen(true);
                    }}
                >
                    Add
                </Button>
            );
        }
        if (activeTab === "durations") {
            return (
                <Button
                    variant="primary"
                    icon={<PlusIcon className="w-5 h-5" />}
                    onClick={() => {
                        setEditingDuration(null);
                        setDurationFormData({
                            rangeName: "",
                            minDays: "1",
                            maxDays: "",
                            priceMultiplier: "1",
                            discountLabel: "",
                        });
                        setIsDurationModalOpen(true);
                    }}
                >
                    Add
                </Button>
            );
        }
        if (activeTab === "payments") {
            return (
                <Button
                    variant="primary"
                    icon={<PlusIcon className="w-5 h-5" />}
                    onClick={() => {
                        setEditingPayment(null);
                        setPaymentFormData({
                            name: "",
                            sign: "+",
                            description: "",
                        });
                        setIsPaymentModalOpen(true);
                    }}
                >
                    Add
                </Button>
            );
        }
        if (activeTab === "currencies") {
            return (
                <Button
                    variant="primary"
                    icon={<PlusIcon className="w-5 h-5" />}
                    onClick={() => {
                        setIsCurrencyModalOpen(true);
                    }}
                >
                    Add
                </Button>
            );
        }
        return null;
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Settings"
                rightActions={getHeaderActions()}
            />

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

            {activeTab === "general" && (
                <Form id="settings-form" method="post" onSubmit={handleSubmit} className="space-y-4">
                    <input type="hidden" name="intent" value="updateGeneral" />

                    {/* Company Information */}
                    <FormSection title="Company Information" icon={<BuildingOfficeIcon />}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <Input
                                    label="Company Name"
                                    name="name"
                                    defaultValue={company.name}
                                    placeholder="e.g., Andaman Rentals"
                                    required
                                />
                                <Input
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    defaultValue={company.email}
                                    placeholder="company@example.com"
                                    required
                                />
                                <Input
                                    label="Phone Number"
                                    name="phone"
                                    defaultValue={company.phone}
                                    placeholder="+66..."
                                    required
                                />
                                <Input
                                    label="Telegram"
                                    name="telegram"
                                    defaultValue={company.telegram || ""}
                                    placeholder="@company_bot"
                                />
                            </div>

                            <div className="grid grid-cols-4 gap-4">
                                <Select
                                    label="Location"
                                    name="locationId"
                                    value={selectedLocationId.toString()}
                                    onChange={(e) => setSelectedLocationId(Number(e.target.value))}
                                    options={locations}
                                    required
                                />
                                <Select
                                    label="District"
                                    name="districtId"
                                    defaultValue={company.districtId.toString()}
                                    options={filteredDistricts}
                                    required
                                />
                                <Input
                                    label="Street"
                                    name="street"
                                    defaultValue={company.street}
                                    placeholder="e.g., Beach Road"
                                    required
                                />
                                <Input
                                    label="House Number"
                                    name="houseNumber"
                                    defaultValue={company.houseNumber}
                                    placeholder="e.g., 45/1"
                                    required
                                />
                            </div>
                        </div>
                    </FormSection>

                    {/* Bank Details */}
                    <FormSection title="Bank Details" icon={<BanknotesIcon />}>
                        <div className="grid grid-cols-4 gap-4">
                            <Input
                                label="Bank Name"
                                name="bankName"
                                defaultValue={company.bankName || ""}
                                placeholder="e.g., Bangkok Bank"
                            />
                            <Input
                                label="Account Number"
                                name="accountNumber"
                                defaultValue={company.accountNumber || ""}
                                placeholder="e.g., 123-456-7890"
                            />
                            <Input
                                label="Account Name"
                                name="accountName"
                                defaultValue={company.accountName || ""}
                                placeholder="e.g., Company Ltd."
                            />
                            <Input
                                label="SWIFT / BIC Code"
                                name="swiftCode"
                                defaultValue={company.swiftCode || ""}
                                placeholder="e.g., BKKBTHBK"
                            />
                        </div>
                    </FormSection>

                    {/* Extras */}
                    <FormSection title="Extras" icon={<Cog6ToothIcon />}>
                        <div className="grid grid-cols-4 gap-4">
                            <Input
                                label="Preparation Time (min)"
                                name="preparationTime"
                                type="number"
                                defaultValue={company.preparationTime?.toString() || "30"}
                                placeholder="30"
                            />
                            <Input
                                label="Delivery Fee (After Hours)"
                                name="deliveryFeeAfterHours"
                                type="number"
                                step="0.01"
                                defaultValue={company.deliveryFeeAfterHours?.toString() || "0"}
                                placeholder="0"
                                addonLeft="฿"
                            />
                            <Input
                                label="Island Trip Cost"
                                name="islandTripPrice"
                                type="number"
                                step="0.01"
                                defaultValue={company.islandTripPrice?.toString() || "0"}
                                placeholder="0"
                                addonLeft="฿"
                            />
                            <Input
                                label="Krabi Trip Cost"
                                name="krabiTripPrice"
                                type="number"
                                step="0.01"
                                defaultValue={company.krabiTripPrice?.toString() || "0"}
                                placeholder="0"
                                addonLeft="฿"
                            />
                        </div>
                        <div className="grid grid-cols-4 gap-4 mt-4">
                            <Input
                                label="Baby Seat Cost (per day)"
                                name="babySeatPricePerDay"
                                type="number"
                                step="0.01"
                                defaultValue={company.babySeatPricePerDay?.toString() || "0"}
                                placeholder="0"
                                addonLeft="฿"
                            />
                        </div>
                    </FormSection>

                    {/* Weekly Schedule */}
                    <input type="hidden" name="weeklySchedule" value={weeklySchedule} />
                    <WeeklySchedule value={weeklySchedule} onChange={setWeeklySchedule} />

                    {/* Holidays */}
                    <input type="hidden" name="holidays" value={holidays} />
                    <HolidaysManager value={holidays} onChange={setHolidays} />
                </Form>
            )}

            {activeTab === "seasons" && (
                <div className="space-y-4">
                    <DataTable
                        columns={seasonColumns}
                        data={seasons}
                        disablePagination={true}
                        emptyTitle="No seasons configured"
                        emptyDescription="Add seasonal pricing periods"
                    />
                    <Modal
                        title={editingSeason ? "Edit Season" : "Add Season"}
                        isOpen={isSeasonModalOpen}
                        onClose={() => setIsSeasonModalOpen(false)}
                        size="md"
                    >
                        <Form method="post" className="space-y-4" onSubmit={handleSeasonSubmit}>
                            <input type="hidden" name="intent" value={editingSeason ? "updateSeason" : "createSeason"} />
                            {editingSeason && <input type="hidden" name="id" value={editingSeason.id} />}
                            <Input
                                label="Season Name"
                                name="seasonName"
                                value={seasonFormData.seasonName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeasonFormData({ ...seasonFormData, seasonName: e.target.value })}
                                placeholder="e.g., Peak Season"
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Start Month</label>
                                    <select name="startMonth" value={seasonFormData.startMonth} onChange={(e) => setSeasonFormData({ ...seasonFormData, startMonth: e.target.value })} className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl" required>
                                        {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">Start Day</label>
                                    <select name="startDay" value={seasonFormData.startDay} onChange={(e) => setSeasonFormData({ ...seasonFormData, startDay: e.target.value })} className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl" required>
                                        {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">End Month</label>
                                    <select name="endMonth" value={seasonFormData.endMonth} onChange={(e) => setSeasonFormData({ ...seasonFormData, endMonth: e.target.value })} className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl" required>
                                        {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-600 mb-1">End Day</label>
                                    <select name="endDay" value={seasonFormData.endDay} onChange={(e) => setSeasonFormData({ ...seasonFormData, endDay: e.target.value })} className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl" required>
                                        {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <Input label="Price Multiplier" name="priceMultiplier" type="number" step="0.01" value={seasonFormData.priceMultiplier} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeasonFormData({ ...seasonFormData, priceMultiplier: e.target.value })} required />
                            <Input label="Discount Label" name="discountLabel" value={seasonFormData.discountLabel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSeasonFormData({ ...seasonFormData, discountLabel: e.target.value })} placeholder="e.g., +50%" />
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsSeasonModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">{editingSeason ? "Update" : "Create"}</Button>
                            </div>
                        </Form>
                    </Modal>
                </div>
            )}

            {activeTab === "durations" && (
                <div className="space-y-4">
                    <DataTable
                        columns={durationColumns}
                        data={durations}
                        disablePagination={true}
                        emptyTitle="No durations configured"
                        emptyDescription="Add rental duration pricing"
                    />
                    <Modal
                        title={editingDuration ? "Edit Duration" : "Add Duration"}
                        isOpen={isDurationModalOpen}
                        onClose={() => setIsDurationModalOpen(false)}
                        size="md"
                    >
                        <Form method="post" className="space-y-4" onSubmit={handleDurationSubmit}>
                            <input type="hidden" name="intent" value={editingDuration ? "updateDuration" : "createDuration"} />
                            {editingDuration && <input type="hidden" name="id" value={editingDuration.id} />}
                            <Input label="Range Name" name="rangeName" value={durationFormData.rangeName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationFormData({ ...durationFormData, rangeName: e.target.value })} placeholder="e.g., Weekly" required />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Min Days" name="minDays" type="number" value={durationFormData.minDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationFormData({ ...durationFormData, minDays: e.target.value })} required />
                                <Input label="Max Days" name="maxDays" type="number" value={durationFormData.maxDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationFormData({ ...durationFormData, maxDays: e.target.value })} placeholder="Leave empty for unlimited" />
                            </div>
                            <Input label="Price Multiplier" name="priceMultiplier" type="number" step="0.01" value={durationFormData.priceMultiplier} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationFormData({ ...durationFormData, priceMultiplier: e.target.value })} required />
                            <Input label="Discount Label" name="discountLabel" value={durationFormData.discountLabel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDurationFormData({ ...durationFormData, discountLabel: e.target.value })} placeholder="e.g., 15% off" />
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsDurationModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">{editingDuration ? "Update" : "Create"}</Button>
                            </div>
                        </Form>
                    </Modal>
                </div>
            )}

            {activeTab === "payments" && (
                <div className="space-y-4">
                    <div className="overflow-hidden">
                        <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white">
                            <div className="overflow-x-auto sm:mx-0">
                                <table className="min-w-full divide-y divide-gray-100 bg-transparent">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th scope="col" className="pl-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>ID</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight w-full">
                                                <span>Name</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight w-24">
                                                <span>Sign</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {/* Income (+) */}
                                        <tr className="group hover:bg-white transition-all">
                                            <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <button className="cursor-pointer">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none transition-all hover:bg-gray-900">
                                                        0001
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-full">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">Rental Payment</span>
                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                        Payment received for car rental service
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-24">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border bg-green-50 text-green-700 border-green-100">
                                                    +
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <Button 
                                                        type="button" 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            setEditingPayment({ id: 1, name: "Rental Payment", sign: "+", description: "Payment received for car rental service" });
                                                            setPaymentFormData({ name: "Rental Payment", sign: "+", description: "Payment received for car rental service" });
                                                            setIsPaymentModalOpen(true);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button type="button" variant="secondary" size="sm" onClick={() => toast.info("Coming soon")}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr className="group hover:bg-white transition-all">
                                            <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <button className="cursor-pointer">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none transition-all hover:bg-gray-900">
                                                        0002
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-full">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">Deposit Received</span>
                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                        Security deposit amount received from client at the start of rental period
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-24">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border bg-green-50 text-green-700 border-green-100">
                                                    +
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <Button 
                                                        type="button" 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            setEditingPayment({ id: 2, name: "Deposit Received", sign: "+", description: "Security deposit amount received from client at the start of rental period" });
                                                            setPaymentFormData({ name: "Deposit Received", sign: "+", description: "Security deposit amount received from client at the start of rental period" });
                                                            setIsPaymentModalOpen(true);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button type="button" variant="secondary" size="sm" onClick={() => toast.info("Coming soon")}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        {/* Expenses (-) */}
                                        <tr className="group hover:bg-white transition-all">
                                            <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <button className="cursor-pointer">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none transition-all hover:bg-gray-900">
                                                        0003
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-full">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">Deposit Return</span>
                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                        Security deposit returned to client at the end of rental period
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-24">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border bg-red-50 text-red-700 border-red-100">
                                                    -
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <Button 
                                                        type="button" 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            setEditingPayment({ id: 3, name: "Deposit Return", sign: "-", description: "Security deposit returned to client at the end of rental period" });
                                                            setPaymentFormData({ name: "Deposit Return", sign: "-", description: "Security deposit returned to client at the end of rental period" });
                                                            setIsPaymentModalOpen(true);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button type="button" variant="secondary" size="sm" onClick={() => toast.info("Coming soon")}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr className="group hover:bg-white transition-all">
                                            <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <button className="cursor-pointer">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none transition-all hover:bg-gray-900">
                                                        0004
                                                    </span>
                                                </button>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-full">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">Refund</span>
                                                    <span className="text-xs text-gray-500 mt-0.5">
                                                        Payment refunded to client for cancellation or overpayment
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-24">
                                                <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border bg-red-50 text-red-700 border-red-100">
                                                    -
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                <div className="flex gap-2">
                                                    <Button 
                                                        type="button" 
                                                        variant="secondary" 
                                                        size="sm" 
                                                        onClick={() => {
                                                            setEditingPayment({ id: 4, name: "Refund", sign: "-", description: "Payment refunded to client for cancellation or overpayment" });
                                                            setPaymentFormData({ name: "Refund", sign: "-", description: "Payment refunded to client for cancellation or overpayment" });
                                                            setIsPaymentModalOpen(true);
                                                        }}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <Button type="button" variant="secondary" size="sm" onClick={() => toast.info("Coming soon")}>
                                                        Delete
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <Modal
                        title={editingPayment ? "Edit Payment Type" : "Add Payment Type"}
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        size="md"
                    >
                        <Form method="post" className="space-y-4" onSubmit={() => { setIsPaymentModalOpen(false); toast.success(editingPayment ? "Payment type updated" : "Payment type created"); }}>
                            <input type="hidden" name="intent" value={editingPayment ? "updatePayment" : "createPayment"} />
                            {editingPayment && <input type="hidden" name="id" value={editingPayment.id} />}
                            <Input
                                label="Payment Type Name"
                                name="name"
                                value={paymentFormData.name}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentFormData({ ...paymentFormData, name: e.target.value })}
                                placeholder="e.g., Rental Payment"
                                required
                            />
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Sign</label>
                                <select
                                    name="sign"
                                    value={paymentFormData.sign}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, sign: e.target.value })}
                                    className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl"
                                    required
                                >
                                    <option value="+">+ (Income)</option>
                                    <option value="-">- (Expense)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs text-gray-600 mb-1">Description</label>
                                <textarea
                                    name="description"
                                    value={paymentFormData.description}
                                    onChange={(e) => setPaymentFormData({ ...paymentFormData, description: e.target.value })}
                                    className="w-full px-4 py-2 text-gray-600 border border-gray-200 rounded-xl"
                                    rows={3}
                                    placeholder="Optional description"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">{editingPayment ? "Update" : "Create"}</Button>
                            </div>
                        </Form>
                    </Modal>
                </div>
            )}

            {activeTab === "currencies" && (
                <div className="space-y-4">
                    <div className="overflow-hidden">
                        <div className="border border-gray-200 rounded-3xl overflow-hidden bg-white">
                            <div className="overflow-x-auto sm:mx-0">
                                <table className="min-w-full divide-y divide-gray-100 bg-transparent">
                                    <thead>
                                        <tr className="bg-gray-50/50">
                                            <th scope="col" className="pl-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>ID</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>Currency</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>Active</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight hidden sm:table-cell">
                                                <span>Default</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {currencies.map((currency) => (
                                            <tr key={currency.id} className="group hover:bg-white transition-all">
                                                <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    <button className="hover:opacity-80 transition-opacity">
                                                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none transition-all hover:bg-gray-900">
                                                            {String(currency.id).padStart(4, '0')}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{currency.name}</span>
                                                        <span className="text-xs text-gray-500 uppercase">{currency.code} ({currency.symbol})</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleToggleCurrency(currency.id, 'isActive')}
                                                        className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${
                                                            currency.isActive 
                                                                ? 'bg-gray-800 border-transparent' 
                                                                : 'bg-gray-200 border-transparent'
                                                        }`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                            currency.isActive ? 'translate-x-4' : 'translate-x-0'
                                                        }`}></span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap hidden sm:table-cell">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleToggleCurrency(currency.id, 'isDefault')}
                                                        disabled={!currency.isActive}
                                                        className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${
                                                            currency.isDefault 
                                                                ? 'bg-gray-800 border-transparent' 
                                                                : 'bg-gray-200 border-transparent'
                                                        } ${!currency.isActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                            currency.isDefault ? 'translate-x-4' : 'translate-x-0'
                                                        }`}></span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <Modal
                        title="Add Currency"
                        isOpen={isCurrencyModalOpen}
                        onClose={() => setIsCurrencyModalOpen(false)}
                        size="md"
                    >
                        <Form method="post" className="space-y-4" onSubmit={() => { setIsCurrencyModalOpen(false); toast.success("Currency added"); }}>
                            <input type="hidden" name="intent" value="createCurrency" />
                            <Input
                                label="Currency Name"
                                name="name"
                                placeholder="e.g., British Pound"
                                required
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Currency Code"
                                    name="code"
                                    placeholder="e.g., GBP"
                                    required
                                />
                                <Input
                                    label="Symbol"
                                    name="symbol"
                                    placeholder="e.g., £"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsCurrencyModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">Create</Button>
                            </div>
                        </Form>
                    </Modal>
                </div>
            )}
        </div>
    );
}
