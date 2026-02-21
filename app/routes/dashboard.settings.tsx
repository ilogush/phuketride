import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, or, isNull, ne } from "drizzle-orm";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import { Textarea } from "~/components/dashboard/Textarea";
import WeeklySchedule from "~/components/dashboard/WeeklySchedule";
import HolidaysManager from "~/components/dashboard/HolidaysManager";
import DataTable, { type Column } from "~/components/dashboard/DataTable";
import Modal from "~/components/dashboard/Modal";
import Toggle from "~/components/dashboard/Toggle";
import { useState, useEffect, useRef } from "react";
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    Cog6ToothIcon,
    CurrencyDollarIcon,
    PlusIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { companySchema } from "~/schemas/company";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { getAdminModCompanyId, getEffectiveCompanyId } from "~/lib/mod-mode.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const companyId = getEffectiveCompanyId(request, user);

    if (!companyId) {
        throw new Response("Company not found", { status: 404 });
    }

    // NOTE: In remote-preview mode (remote bindings), concurrent D1 requests can intermittently fail.
    // Keep these queries sequential to reduce flakiness during dev.
    const company = await db
        .select()
        .from(schema.companies)
        .where(eq(schema.companies.id, companyId))
        .limit(1);
    const locations = await db.select().from(schema.locations).limit(100);
    const districts = await db.select().from(schema.districts).limit(200);
    // Get system templates (company_id IS NULL) OR company-specific templates
    const paymentTypes = await db
        .select()
        .from(schema.paymentTypes)
        .where(or(isNull(schema.paymentTypes.companyId), eq(schema.paymentTypes.companyId, companyId)))
        .limit(100);
    const currencies = await db
        .select()
        .from(schema.currencies)
        .orderBy(schema.currencies.name)
        .limit(50);

    if (!company || company.length === 0) {
        throw new Response("Company not found", { status: 404 });
    }

    return { user, company: company[0], locations, districts, paymentTypes, currencies };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");
    const companyId = getEffectiveCompanyId(request, user);
    const adminModCompanyId = getAdminModCompanyId(request, user);
    const withMode = (path: string) => {
        if (!adminModCompanyId) {
            return path;
        }
        const separator = path.includes("?") ? "&" : "?";
        return `${path}${separator}modCompanyId=${adminModCompanyId}`;
    };

    if (!companyId) {
        return redirect(withMode("/settings?error=Company not found"));
    }

    // Get current company for audit log
    const currentCompany = await db.select().from(schema.companies).where(eq(schema.companies.id, companyId)).get();

    if (intent === "updateGeneral") {
        const parseMoneyValue = (value: FormDataEntryValue | null): number | null => {
            if (typeof value !== "string") return null;
            const normalized = value.replace(",", ".").trim();
            if (!normalized) return null;
            const parsed = Number(normalized);
            if (!Number.isFinite(parsed)) return null;
            return Math.round(Math.abs(parsed) * 100) / 100;
        };

        const parseIntegerValue = (value: FormDataEntryValue | null, fallback: number): number => {
            if (typeof value !== "string") return fallback;
            const normalized = value.replace(",", ".").trim();
            if (!normalized) return fallback;
            const parsed = Number(normalized);
            if (!Number.isFinite(parsed)) return fallback;
            return Math.max(0, Math.round(Math.abs(parsed)));
        };

        const rawData = {
            name: formData.get("name") as string,
            email: formData.get("email") as string,
            phone: formData.get("phone") as string,
            telegram: (formData.get("telegram") as string) || null,
            locationId: Number(formData.get("locationId")),
            districtId: Number(formData.get("districtId")),
            street: formData.get("street") as string,
            houseNumber: formData.get("houseNumber") as string,
            bankName: (formData.get("bankName") as string) || null,
            accountNumber: (formData.get("accountNumber") as string) || null,
            accountName: (formData.get("accountName") as string) || null,
            swiftCode: (formData.get("swiftCode") as string) || null,
            preparationTime: parseIntegerValue(formData.get("preparationTime"), 30),
            deliveryFeeAfterHours: parseMoneyValue(formData.get("deliveryFeeAfterHours")) ?? 0,
            islandTripPrice: parseMoneyValue(formData.get("islandTripPrice")),
            krabiTripPrice: parseMoneyValue(formData.get("krabiTripPrice")),
            babySeatPricePerDay: parseIntegerValue(formData.get("babySeatPricePerDay"), 0),
        };

        // Validate with Zod
        const validation = companySchema.safeParse(rawData);
        if (!validation.success) {
            const firstError = validation.error.errors[0];
            return redirect(withMode(`/settings?error=${encodeURIComponent(firstError.message)}`));
        }

        const validData = validation.data;
        const weeklySchedule = formData.get("weeklySchedule") as string;
        const holidays = formData.get("holidays") as string;

        try {
            await db.update(schema.companies)
                .set({
                    name: validData.name,
                    email: validData.email,
                    phone: validData.phone,
                    telegram: validData.telegram,
                    locationId: validData.locationId,
                    districtId: validData.districtId,
                    street: validData.street,
                    houseNumber: validData.houseNumber,
                    bankName: validData.bankName,
                    accountNumber: validData.accountNumber,
                    accountName: validData.accountName,
                    swiftCode: validData.swiftCode,
                    preparationTime: validData.preparationTime,
                    deliveryFeeAfterHours: validData.deliveryFeeAfterHours,
                    islandTripPrice: validData.islandTripPrice,
                    krabiTripPrice: validData.krabiTripPrice,
                    babySeatPricePerDay: validData.babySeatPricePerDay,
                    weeklySchedule,
                    holidays,
                    updatedAt: new Date(),
                })
                .where(eq(schema.companies.id, companyId));

            // Keep company delivery settings in sync with selected location/district:
            // selected district is active with zero delivery cost, all others are inactive.
            const locationDistricts = await db
                .select({
                    id: schema.districts.id,
                    deliveryPrice: schema.districts.deliveryPrice,
                })
                .from(schema.districts)
                .where(eq(schema.districts.locationId, validData.locationId));

            const existingCompanySettings = await db
                .select({
                    id: schema.companyDeliverySettings.id,
                    districtId: schema.companyDeliverySettings.districtId,
                    deliveryPrice: schema.companyDeliverySettings.deliveryPrice,
                })
                .from(schema.companyDeliverySettings)
                .where(eq(schema.companyDeliverySettings.companyId, companyId));

            const settingsByDistrictId = new Map(existingCompanySettings.map((row) => [row.districtId, row]));

            for (const district of locationDistricts) {
                const existing = settingsByDistrictId.get(district.id);
                const isCompanyDistrict = district.id === validData.districtId;
                const nextPrice = isCompanyDistrict ? 0 : (existing?.deliveryPrice ?? district.deliveryPrice ?? 0);

                if (existing) {
                    await db
                        .update(schema.companyDeliverySettings)
                        .set({
                            isActive: isCompanyDistrict,
                            deliveryPrice: nextPrice,
                            updatedAt: new Date(),
                        })
                        .where(eq(schema.companyDeliverySettings.id, existing.id));
                } else {
                    await db
                        .insert(schema.companyDeliverySettings)
                        .values({
                            companyId,
                            districtId: district.id,
                            isActive: isCompanyDistrict,
                            deliveryPrice: nextPrice,
                        });
                }
            }

            // Audit log
            const metadata = getRequestMetadata(request);
            quickAudit({
                db,
                userId: user.id,
                role: user.role,
                companyId,
                entityType: "company",
                entityId: companyId,
                action: "update",
                beforeState: currentCompany,
                afterState: { ...validData, id: companyId },
                ...metadata,
            });

            return redirect(withMode("/settings?success=Settings updated successfully"));
        } catch {
            return redirect(withMode("/settings?error=Failed to update settings"));
        }
    }

    // Seasons actions - REMOVED (admin only via /seasons route)

    // Durations actions - REMOVED (admin only via /durations route)

    // Currency actions
    if (intent === "setDefaultCurrency") {
        const currencyId = Number(formData.get("currencyId"));
        
        try {
            // Default currency must be active.
            await db.update(schema.currencies)
                .set({ companyId, isActive: true, updatedAt: new Date() })
                .where(eq(schema.currencies.id, currencyId));

            // Clear other currencies for this company
            await db.update(schema.currencies)
                .set({ companyId: null })
                .where(and(
                    eq(schema.currencies.companyId, companyId),
                    ne(schema.currencies.id, currencyId)
                ));

            return redirect(withMode("/settings?tab=currencies&success=Default currency updated"));
        } catch {
            return redirect(withMode("/settings?tab=currencies&error=Failed to update default currency"));
        }
    }

    if (intent === "toggleCurrencyActive") {
        const currencyId = Number(formData.get("currencyId"));
        const isActive = formData.get("isActive") === "true";

        try {
            await db.update(schema.currencies)
                .set({
                    isActive,
                    companyId: isActive ? undefined : null,
                    updatedAt: new Date(),
                })
                .where(eq(schema.currencies.id, currencyId));

            return redirect(withMode("/settings?tab=currencies&success=Currency status updated"));
        } catch {
            return redirect(withMode("/settings?tab=currencies&error=Failed to update currency status"));
        }
    }

    if (intent === "createCurrency") {
        const name = (formData.get("name") as string)?.trim();
        const code = (formData.get("code") as string)?.trim().toUpperCase();
        const symbol = (formData.get("symbol") as string)?.trim();

        if (!name || !code || !symbol) {
            return redirect(withMode("/settings?tab=currencies&error=All currency fields are required"));
        }

        try {
            await db.insert(schema.currencies).values({
                name,
                code,
                symbol,
                isActive: true,
                companyId: null,
            });

            return redirect(withMode("/settings?tab=currencies&success=Currency created successfully"));
        } catch {
            return redirect(withMode("/settings?tab=currencies&error=Failed to create currency"));
        }
    }

    // Payment templates actions
    if (intent === "updatePaymentTemplate") {
        const id = Number(formData.get("id"));
        const showOnCreate = formData.get("showOnCreate") === "true";
        const showOnClose = formData.get("showOnClose") === "true";
        const isActive = formData.get("isActive") === "true";

        try {
            // Check if this is a system template
            const template = await db.select().from(schema.paymentTypes).where(eq(schema.paymentTypes.id, id)).get();
            
            if (!template) {
                return redirect(withMode("/settings?error=Payment template not found"));
            }

            // System templates: only update toggles
            // Company templates: check ownership
            if (template.companyId !== null && template.companyId !== companyId) {
                return redirect(withMode("/settings?error=Unauthorized"));
            }

            await db.update(schema.paymentTypes)
                .set({
                    showOnCreate,
                    showOnClose,
                    isActive,
                    updatedAt: new Date(),
                })
                .where(eq(schema.paymentTypes.id, id));

            return redirect(withMode("/settings?success=Payment template updated successfully"));
        } catch {
            return redirect(withMode("/settings?error=Failed to update payment template"));
        }
    }

    if (intent === "createPaymentTemplate") {
        const name = formData.get("name") as string;
        const sign = formData.get("sign") as "+" | "-";
        const description = (formData.get("description") as string) || null;
        const showOnCreate = formData.get("showOnCreate") === "true";
        const showOnClose = formData.get("showOnClose") === "true";

        try {
            await db.insert(schema.paymentTypes).values({
                name,
                sign,
                description,
                companyId,
                isSystem: false,
                isActive: true,
                showOnCreate,
                showOnClose,
            });

            return redirect(withMode("/settings?success=Payment template created successfully"));
        } catch {
            return redirect(withMode("/settings?error=Failed to create payment template"));
        }
    }

    if (intent === "deletePaymentTemplate") {
        const id = Number(formData.get("id"));
        
        try {
            // Check if this is a company template (not system)
            const template = await db.select().from(schema.paymentTypes).where(eq(schema.paymentTypes.id, id)).get();
            
            if (!template) {
                return redirect(withMode("/settings?error=Payment template not found"));
            }

            if (template.isSystem || template.companyId === null) {
                return redirect(withMode("/settings?error=Cannot delete system templates"));
            }

            if (template.companyId !== companyId) {
                return redirect(withMode("/settings?error=Unauthorized"));
            }

            await db.delete(schema.paymentTypes)
                .where(and(eq(schema.paymentTypes.id, id), eq(schema.paymentTypes.companyId, companyId)));

            return redirect(withMode("/settings?success=Payment template deleted successfully"));
        } catch {
            return redirect(withMode("/settings?error=Failed to delete payment template"));
        }
    }

    return redirect(withMode("/settings?error=Invalid action"));
}

export default function SettingsPage() {
    const { company, locations, districts, paymentTypes, currencies } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "general";
    const modCompanyId = searchParams.get("modCompanyId");
    const settingsActionUrl = modCompanyId ? `/settings?modCompanyId=${modCompanyId}` : "/settings";
    const [selectedLocationId, setSelectedLocationId] = useState(company.locationId);
    const [weeklySchedule, setWeeklySchedule] = useState(company.weeklySchedule || "");
    const [holidays, setHolidays] = useState(company.holidays || "");
    const shownToastsRef = useRef<Set<string>>(new Set());
    const { validateLatinInput } = useLatinValidation();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPaymentTemplate, setEditingPaymentTemplate] = useState<any | null>(null);
    const [paymentFormData, setPaymentFormData] = useState({
        name: "",
        sign: "+",
        description: "",
        showOnCreate: false,
        showOnClose: false,
    });
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const toast = useToast();

    // Toast notifications
    useEffect(() => {
        const success = searchParams.get("success");
        const error = searchParams.get("error");
        
        const toastKey = success || error;
        
        if (toastKey && !shownToastsRef.current.has(toastKey)) {
            // Mark as shown
            shownToastsRef.current.add(toastKey);
            
            // Show toast
            if (success) {
                toast.success(success);
            }
            if (error) {
                toast.error(error);
            }
            
            // Clear URL params
            setSearchParams((prev) => {
                const newParams = new URLSearchParams(prev);
                newParams.delete("success");
                newParams.delete("error");
                return newParams;
            }, { replace: true });
        }
    }, [searchParams, toast, setSearchParams]);

    const tabs = [
        { id: "general", label: "General" },
        { id: "payments", label: "Payments" },
        { id: "currencies", label: "Currencies" },
    ];

    const filteredDistricts = districts.filter(d => d.locationId === selectedLocationId);

    const handleTabChange = (tabId: string | number) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("tab", String(tabId));
        setSearchParams(nextParams);
    };

    const postWithReload = (entries: Record<string, string>) => {
        if (typeof document === "undefined") return;
        const form = document.createElement("form");
        form.method = "post";
        form.action = settingsActionUrl;
        form.style.display = "none";
        Object.entries(entries).forEach(([name, value]) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = value;
            form.appendChild(input);
        });
        document.body.appendChild(form);
        form.submit();
    };

    const handleTogglePaymentTemplate = (id: number, field: 'showOnCreate' | 'showOnClose' | 'isActive', currentValue: boolean | null) => {
        const template = paymentTypes.find(t => t.id === id);
        if (!template) return;

        postWithReload({
            intent: "updatePaymentTemplate",
            id: String(id),
            showOnCreate: field === "showOnCreate" ? String(!currentValue) : String(template.showOnCreate ?? false),
            showOnClose: field === "showOnClose" ? String(!currentValue) : String(template.showOnClose ?? false),
            isActive: field === "isActive" ? String(!currentValue) : String(template.isActive ?? true),
        });
    };

    const handleToggleCurrency = (id: number, field: 'isActive' | 'isDefault') => {
        if (field === 'isDefault') {
            postWithReload({
                intent: "setDefaultCurrency",
                currencyId: String(id),
            });
        } else {
            const target = currencies.find(c => c.id === id);
            if (!target) return;

            postWithReload({
                intent: "toggleCurrencyActive",
                currencyId: String(id),
                isActive: String(!target.isActive),
            });
        }
    };

    const getHeaderActions = () => {
        if (activeTab === "general") {
            return (
                <Button type="submit" variant="primary" form="settings-form">
                    Save
                </Button>
            );
        }
        if (activeTab === "payments") {
            return (
                <Button
                    variant="primary"
                    icon={<PlusIcon className="w-5 h-5" />}
                    onClick={() => {
                        setPaymentFormData({
                            name: "",
                            sign: "+",
                            description: "",
                            showOnCreate: false,
                            showOnClose: false,
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

            <Tabs tabs={tabs} activeTab={activeTab} onTabChange={handleTabChange} />

            {activeTab === "general" && (
                <Form id="settings-form" method="post" action={settingsActionUrl} className="space-y-4" reloadDocument>
                    <input type="hidden" name="intent" value="updateGeneral" />

                    {/* Company Information */}
                    <FormSection title="Company Information" icon={<BuildingOfficeIcon />}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                    label="Company Name"
                                    name="name"
                                    defaultValue={company.name}
                                    placeholder="e.g., Andaman Rentals"
                                    onChange={(e) => validateLatinInput(e, "Company Name")}
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    onChange={(e) => validateLatinInput(e, "Street")}
                                    required
                                />
                                <Input
                                    label="House Number"
                                    name="houseNumber"
                                    defaultValue={company.houseNumber}
                                    placeholder="e.g., 45/1"
                                    onChange={(e) => validateLatinInput(e, "House Number")}
                                    required
                                />
                            </div>
                        </div>
                    </FormSection>

                    {/* Bank Details */}
                    <FormSection title="Bank Details" icon={<BanknotesIcon />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input
                                label="Bank Name"
                                name="bankName"
                                defaultValue={company.bankName || ""}
                                placeholder="e.g., Bangkok Bank"
                                onChange={(e) => validateLatinInput(e, "Bank Name")}
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
                                onChange={(e) => validateLatinInput(e, "Account Name")}
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                            <Input
                                label="Baby Seat Cost (per day)"
                                name="babySeatPricePerDay"
                                type="number"
                                step="1"
                                min={0}
                                defaultValue={Math.max(0, Math.round(company.babySeatPricePerDay ?? 0)).toString()}
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
                                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight whitespace-nowrap">
                                                <span>On Create</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight whitespace-nowrap">
                                                <span>On Close</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>Actions</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {paymentTypes.map((template) => (
                                            <tr key={template.id} className="group hover:bg-white transition-all">
                                                <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
                                                        {String(template.id).padStart(4, '0')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-full">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{template.name}</span>
                                                        {template.description && (
                                                            <span className="text-xs text-gray-500 mt-0.5">
                                                                {template.description}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-24">
                                                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-lg text-sm font-bold border ${
                                                        template.sign === '+' 
                                                            ? 'bg-green-50 text-green-700 border-green-100' 
                                                            : 'bg-red-50 text-red-700 border-red-100'
                                                    }`}>
                                                        {template.sign}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                                                    <Toggle
                                                        size="sm"
                                                        enabled={Boolean(template.showOnCreate)}
                                                        onChange={() => handleTogglePaymentTemplate(template.id, 'showOnCreate', template.showOnCreate ?? false)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                                                    <Toggle
                                                        size="sm"
                                                        enabled={Boolean(template.showOnClose)}
                                                        onChange={() => handleTogglePaymentTemplate(template.id, 'showOnClose', template.showOnClose ?? false)}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    <div className="flex gap-2">
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => {
                                                                setPaymentFormData({
                                                                    name: template.name,
                                                                    sign: template.sign ?? "+",
                                                                    description: template.description || "",
                                                                    showOnCreate: template.showOnCreate ?? false,
                                                                    showOnClose: template.showOnClose ?? false,
                                                                });
                                                                setEditingPaymentTemplate(template);
                                                                setIsPaymentModalOpen(true);
                                                            }}
                                                        >
                                                            Edit
                                                        </Button>
                                                        {!template.isSystem && (
                                                            <Form method="post" action={settingsActionUrl} reloadDocument>
                                                                <input type="hidden" name="intent" value="deletePaymentTemplate" />
                                                                <input type="hidden" name="id" value={template.id} />
                                                                <Button type="submit" variant="secondary" size="sm">Delete</Button>
                                                            </Form>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <Modal
                        title={editingPaymentTemplate ? "Edit Payment Template" : "Add Payment Template"}
                        isOpen={isPaymentModalOpen}
                        onClose={() => {
                            setIsPaymentModalOpen(false);
                            setEditingPaymentTemplate(null);
                        }}
                        size="md"
                    >
                        <Form method="post" action={settingsActionUrl} className="space-y-4" reloadDocument onSubmit={() => {
                            setIsPaymentModalOpen(false);
                            setEditingPaymentTemplate(null);
                        }}>
                            <input type="hidden" name="intent" value={editingPaymentTemplate ? "updatePaymentTemplate" : "createPaymentTemplate"} />
                            {editingPaymentTemplate && <input type="hidden" name="id" value={editingPaymentTemplate.id} />}
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
                            <Textarea
                                label="Description"
                                name="description"
                                value={paymentFormData.description}
                                onChange={(value) => setPaymentFormData({ ...paymentFormData, description: value })}
                                rows={3}
                                placeholder="Optional description"
                            />
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Show when creating contract</span>
                                    <Toggle
                                        size="sm"
                                        enabled={paymentFormData.showOnCreate}
                                        onChange={() => setPaymentFormData({ ...paymentFormData, showOnCreate: !paymentFormData.showOnCreate })}
                                    />
                                    <input type="hidden" name="showOnCreate" value={paymentFormData.showOnCreate ? "true" : "false"} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">Show when closing contract</span>
                                    <Toggle
                                        size="sm"
                                        enabled={paymentFormData.showOnClose}
                                        onChange={() => setPaymentFormData({ ...paymentFormData, showOnClose: !paymentFormData.showOnClose })}
                                    />
                                    <input type="hidden" name="showOnClose" value={paymentFormData.showOnClose ? "true" : "false"} />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => {
                                    setIsPaymentModalOpen(false);
                                    setEditingPaymentTemplate(null);
                                }}>Cancel</Button>
                                <Button type="submit" variant="primary">{editingPaymentTemplate ? "Update" : "Create"}</Button>
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
                                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>Default</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>Active</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {currencies.map((currency) => (
                                            <tr key={currency.id} className="group hover:bg-white transition-all">
                                                <td className="pl-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none">
                                                        {String(currency.id).padStart(4, '0')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900">{currency.name}</span>
                                                        <span className="text-xs text-gray-500 uppercase">{currency.code} ({currency.symbol})</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                                                    <Toggle
                                                        size="sm"
                                                        enabled={currency.companyId === company.id}
                                                        onChange={() => handleToggleCurrency(currency.id, 'isDefault')}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                                                    <Toggle
                                                        size="sm"
                                                        enabled={Boolean(currency.isActive)}
                                                        onChange={() => handleToggleCurrency(currency.id, 'isActive')}
                                                    />
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
                        <Form method="post" action={settingsActionUrl} className="space-y-4" reloadDocument onSubmit={() => { setIsCurrencyModalOpen(false); toast.success("Currency added"); }}>
                            <input type="hidden" name="intent" value="createCurrency" />
                            <Input
                                label="Currency Name"
                                name="name"
                                placeholder="e.g., British Pound"
                                required
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
