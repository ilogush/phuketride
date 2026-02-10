import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useRevalidator, useSearchParams } from "react-router";
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

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    if (!user.companyId) {
        throw new Response("Company not found", { status: 404 });
    }

    const [company, locations, districts, paymentTypes, currencies] = await Promise.all([
        db.select().from(schema.companies).where(eq(schema.companies.id, user.companyId)).limit(1),
        db.select().from(schema.locations).limit(100),
        db.select().from(schema.districts).limit(200),
        // Get system templates (company_id IS NULL) OR company-specific templates
        db.select().from(schema.paymentTypes).where(
            or(
                isNull(schema.paymentTypes.companyId),
                eq(schema.paymentTypes.companyId, user.companyId)
            )
        ).limit(100),
        db.select().from(schema.currencies).where(eq(schema.currencies.isActive, true)).limit(50),
    ]);

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

    if (!user.companyId) {
        return redirect("/settings?error=Company not found");
    }

    // Get current company for audit log
    const currentCompany = await db.select().from(schema.companies).where(eq(schema.companies.id, user.companyId)).get();

    if (intent === "updateGeneral") {
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
            preparationTime: formData.get("preparationTime") ? Number(formData.get("preparationTime")) : 30,
            deliveryFeeAfterHours: formData.get("deliveryFeeAfterHours") ? Number(formData.get("deliveryFeeAfterHours")) : 0,
            islandTripPrice: formData.get("islandTripPrice") ? Number(formData.get("islandTripPrice")) : null,
            krabiTripPrice: formData.get("krabiTripPrice") ? Number(formData.get("krabiTripPrice")) : null,
            babySeatPricePerDay: formData.get("babySeatPricePerDay") ? Number(formData.get("babySeatPricePerDay")) : null,
        };

        // Validate with Zod
        const validation = companySchema.safeParse(rawData);
        if (!validation.success) {
            const firstError = validation.error.errors[0];
            return redirect(`/settings?error=${encodeURIComponent(firstError.message)}`);
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
                .where(eq(schema.companies.id, user.companyId));

            // Audit log
            const metadata = getRequestMetadata(request);
            quickAudit({
                db,
                userId: user.id,
                role: user.role,
                companyId: user.companyId,
                entityType: "company",
                entityId: user.companyId,
                action: "update",
                beforeState: currentCompany,
                afterState: { ...validData, id: user.companyId },
                ...metadata,
            });

            return redirect("/settings?success=Settings updated successfully");
        } catch (error) {
            console.error("Failed to update settings:", error);
            return redirect("/settings?error=Failed to update settings");
        }
    }

    // Seasons actions - REMOVED (admin only via /seasons route)

    // Durations actions - REMOVED (admin only via /durations route)

    // Currency actions
    if (intent === "setDefaultCurrency") {
        const currencyId = Number(formData.get("currencyId"));
        
        try {
            // Update currency to set companyId (marks as default for this company)
            await db.update(schema.currencies)
                .set({ companyId: user.companyId })
                .where(eq(schema.currencies.id, currencyId));

            // Clear other currencies for this company
            await db.update(schema.currencies)
                .set({ companyId: null })
                .where(and(
                    eq(schema.currencies.companyId, user.companyId),
                    ne(schema.currencies.id, currencyId)
                ));

            return redirect("/settings?tab=currencies&success=Default currency updated");
        } catch (error) {
            console.error("Failed to set default currency:", error);
            return redirect("/settings?tab=currencies&error=Failed to update default currency");
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
                return redirect("/settings?error=Payment template not found");
            }

            // System templates: only update toggles
            // Company templates: check ownership
            if (template.companyId !== null && template.companyId !== user.companyId) {
                return redirect("/settings?error=Unauthorized");
            }

            await db.update(schema.paymentTypes)
                .set({
                    showOnCreate,
                    showOnClose,
                    isActive,
                    updatedAt: new Date(),
                })
                .where(eq(schema.paymentTypes.id, id));

            return redirect("/settings?success=Payment template updated successfully");
        } catch (error) {
            console.error("Failed to update payment template:", error);
            return redirect("/settings?error=Failed to update payment template");
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
                companyId: user.companyId,
                isSystem: false,
                isActive: true,
                showOnCreate,
                showOnClose,
            });

            return redirect("/settings?success=Payment template created successfully");
        } catch (error) {
            console.error("Failed to create payment template:", error);
            return redirect("/settings?error=Failed to create payment template");
        }
    }

    if (intent === "deletePaymentTemplate") {
        const id = Number(formData.get("id"));
        
        try {
            // Check if this is a company template (not system)
            const template = await db.select().from(schema.paymentTypes).where(eq(schema.paymentTypes.id, id)).get();
            
            if (!template) {
                return redirect("/settings?error=Payment template not found");
            }

            if (template.isSystem || template.companyId === null) {
                return redirect("/settings?error=Cannot delete system templates");
            }

            if (template.companyId !== user.companyId) {
                return redirect("/settings?error=Unauthorized");
            }

            await db.delete(schema.paymentTypes)
                .where(and(eq(schema.paymentTypes.id, id), eq(schema.paymentTypes.companyId, user.companyId)));

            return redirect("/settings?success=Payment template deleted successfully");
        } catch (error) {
            console.error("Failed to delete payment template:", error);
            return redirect("/settings?error=Failed to delete payment template");
        }
    }

    return redirect("/settings?error=Invalid action");
}

export default function SettingsPage() {
    const { company, locations, districts, paymentTypes, currencies } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "general";
    const [selectedLocationId, setSelectedLocationId] = useState(company.locationId);
    const [weeklySchedule, setWeeklySchedule] = useState(company.weeklySchedule || "");
    const [holidays, setHolidays] = useState(company.holidays || "");
    const shownToastsRef = useRef<Set<string>>(new Set());
    const { validateLatinInput } = useLatinValidation();
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentFormData, setPaymentFormData] = useState({
        name: "",
        sign: "+",
        description: "",
        showOnCreate: false,
        showOnClose: false,
    });
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const toast = useToast();
    const revalidator = useRevalidator();

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
        setSearchParams({ tab: String(tabId) });
    };

    const handleTogglePaymentTemplate = async (id: number, field: 'showOnCreate' | 'showOnClose' | 'isActive', currentValue: boolean | null) => {
        const formData = new FormData();
        formData.append("intent", "updatePaymentTemplate");
        formData.append("id", String(id));
        
        const template = paymentTypes.find(t => t.id === id);
        if (!template) return;
        
        formData.append("showOnCreate", field === 'showOnCreate' ? String(!currentValue) : String(template.showOnCreate ?? false));
        formData.append("showOnClose", field === 'showOnClose' ? String(!currentValue) : String(template.showOnClose ?? false));
        formData.append("isActive", field === 'isActive' ? String(!currentValue) : String(template.isActive ?? true));
        
        try {
            await fetch("/settings", { method: "POST", body: formData });
            revalidator.revalidate();
            toast.success("Payment template updated");
        } catch (error) {
            toast.error("Failed to update payment template");
        }
    };

    const handleToggleCurrency = async (id: number, field: 'isActive' | 'isDefault') => {
        if (field === 'isDefault') {
            // Set this currency as default for company by updating companyId
            const formData = new FormData();
            formData.append("intent", "setDefaultCurrency");
            formData.append("currencyId", String(id));
            
            try {
                await fetch("/settings", { method: "POST", body: formData });
                revalidator.revalidate();
                toast.success("Default currency updated");
            } catch (error) {
                toast.error("Failed to update default currency");
            }
        } else {
            toast.info("Currency management coming soon");
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
                <Form id="settings-form" method="post" className="space-y-4">
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
                                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>On Create</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>On Close</span>
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-center text-sm font-semibold text-gray-400 tracking-tight">
                                                <span>Active</span>
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
                                                    <button className="cursor-pointer">
                                                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-gray-800 text-white min-w-[2.25rem] h-5 leading-none transition-all hover:bg-gray-900">
                                                            {String(template.id).padStart(4, '0')}
                                                        </span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap w-full">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-medium text-gray-900">{template.name}</span>
                                                            {template.isSystem && (
                                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-100">
                                                                    SYSTEM
                                                                </span>
                                                            )}
                                                        </div>
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
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleTogglePaymentTemplate(template.id, 'showOnCreate', template.showOnCreate ?? false)}
                                                        className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${
                                                            template.showOnCreate 
                                                                ? 'bg-gray-800 border-transparent' 
                                                                : 'bg-gray-200 border-transparent'
                                                        }`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                            template.showOnCreate ? 'translate-x-4' : 'translate-x-0'
                                                        }`}></span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleTogglePaymentTemplate(template.id, 'showOnClose', template.showOnClose ?? false)}
                                                        className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${
                                                            template.showOnClose 
                                                                ? 'bg-gray-800 border-transparent' 
                                                                : 'bg-gray-200 border-transparent'
                                                        }`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                            template.showOnClose ? 'translate-x-4' : 'translate-x-0'
                                                        }`}></span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleTogglePaymentTemplate(template.id, 'isActive', template.isActive ?? true)}
                                                        className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${
                                                            template.isActive 
                                                                ? 'bg-gray-800 border-transparent' 
                                                                : 'bg-gray-200 border-transparent'
                                                        }`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                            template.isActive ? 'translate-x-4' : 'translate-x-0'
                                                        }`}></span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                                                    {!template.isSystem && (
                                                        <Form method="post">
                                                            <input type="hidden" name="intent" value="deletePaymentTemplate" />
                                                            <input type="hidden" name="id" value={template.id} />
                                                            <Button type="submit" variant="secondary" size="sm">Delete</Button>
                                                        </Form>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    <Modal
                        title="Add Payment Template"
                        isOpen={isPaymentModalOpen}
                        onClose={() => setIsPaymentModalOpen(false)}
                        size="md"
                    >
                        <Form method="post" className="space-y-4" onSubmit={() => setIsPaymentModalOpen(false)}>
                            <input type="hidden" name="intent" value="createPaymentTemplate" />
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
                            <div className="space-y-3">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="showOnCreate"
                                        checked={paymentFormData.showOnCreate}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, showOnCreate: e.target.checked })}
                                        value="true"
                                        className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
                                    />
                                    <span className="text-sm text-gray-700">Show when creating contract</span>
                                </label>
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="showOnClose"
                                        checked={paymentFormData.showOnClose}
                                        onChange={(e) => setPaymentFormData({ ...paymentFormData, showOnClose: e.target.checked })}
                                        value="true"
                                        className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
                                    />
                                    <span className="text-sm text-gray-700">Show when closing contract</span>
                                </label>
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="secondary" onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                                <Button type="submit" variant="primary">Create</Button>
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
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => handleToggleCurrency(currency.id, 'isDefault')}
                                                        className={`relative inline-flex h-5 w-9 rounded-full border-2 transition-colors ${
                                                            currency.companyId === company.id 
                                                                ? 'bg-gray-800 border-transparent' 
                                                                : 'bg-gray-200 border-transparent'
                                                        }`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                                            currency.companyId === company.id ? 'translate-x-4' : 'translate-x-0'
                                                        }`}></span>
                                                    </button>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap text-center">
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
