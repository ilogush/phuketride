import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, useSearchParams, useSubmit } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import Button from "~/components/dashboard/Button";
import { useState } from "react";
import {
    PlusIcon,
} from "@heroicons/react/24/outline";
import { useToast } from "~/lib/toast";
import { useUrlToast } from "~/lib/useUrlToast";
import { getAdminModCompanyId, getEffectiveCompanyId } from "~/lib/mod-mode.server";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { isPhuketName, normalizeCompanyRow, normalizeCurrencyRow } from "~/lib/settings-normalizers";
import type { Currency } from "~/lib/settings-normalizers";
import { getCachedCurrenciesDetailed, getCachedPaymentTemplatesForCompany } from "~/lib/dictionaries-cache.server";
import PaymentTemplatesTab from "~/components/dashboard/settings/PaymentTemplatesTab";
import CurrenciesTab from "~/components/dashboard/settings/CurrenciesTab";
import GeneralSettingsTab from "~/components/dashboard/settings/GeneralSettingsTab";
import { handleSettingsAction } from "~/lib/settings-actions.server";

type CompanySettings = {
    id: number;
    name: string;
    email: string;
    phone: string;
    telegram: string | null;
    locationId: number | null;
    districtId: number | null;
    street: string;
    houseNumber: string;
    bankName: string | null;
    accountNumber: string | null;
    accountName: string | null;
    swiftCode: string | null;
    deliveryFeeAfterHours: number | null;
    islandTripPrice: number | null;
    krabiTripPrice: number | null;
    babySeatPricePerDay: number | null;
    weeklySchedule: string | null;
    holidays: string | null;
};
type ListItem = { id: number; name: string;[key: string]: unknown };
type PaymentType = {
    id: number;
    name: string;
    sign: "+" | "-";
    description: string | null;
    isActive?: boolean | number | null;
    isSystem?: boolean | number | null;
    companyId?: number | null;
};
type CompanyRow = Record<string, unknown>;
export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const companyId = getEffectiveCompanyId(request, user);

    if (!companyId) {
        throw new Response("Company not found", { status: 404 });
    }

    // NOTE: In remote-preview mode (remote bindings), concurrent D1 requests can intermittently fail.
    // Keep these queries sequential to reduce flakiness during dev.
    const [companyRow, locations, districts, paymentTypes, currencies] = await Promise.all([
        context.cloudflare.env.DB
            .prepare(`
                SELECT
                    id, name, email, phone, telegram, location_id, district_id, street, house_number,
                    bank_name, account_number, account_name, swift_code, delivery_fee_after_hours,
                    island_trip_price, krabi_trip_price, baby_seat_price_per_day, weekly_schedule, holidays
                FROM companies
                WHERE id = ?
                LIMIT 1
            `)
            .bind(companyId)
            .first() as Promise<CompanyRow | null>,
        context.cloudflare.env.DB
            .prepare(`SELECT id, name FROM locations LIMIT ${QUERY_LIMITS.LARGE}`)
            .all()
            .then((r: { results?: ListItem[] }) => r.results || []),
        context.cloudflare.env.DB
            .prepare(`SELECT id, name, location_id AS locationId FROM districts LIMIT ${QUERY_LIMITS.XL}`)
            .all()
            .then((r: { results?: ListItem[] }) => r.results || []),
        getCachedPaymentTemplatesForCompany(context.cloudflare.env.DB, companyId) as Promise<PaymentType[]>,
        getCachedCurrenciesDetailed(context.cloudflare.env.DB) as Promise<Currency[]>,
    ]);

    if (!companyRow) {
        throw new Response("Company not found", { status: 404 });
    }
    const company = normalizeCompanyRow(companyRow as Record<string, unknown>) as CompanySettings;
    const companyLocation = (locations as ListItem[]).find((location) => Number(location.id) === Number(company.locationId));
    const isPhuketCompany = isPhuketName(companyLocation?.name);

    if (isPhuketCompany) {
        const thbCurrency = await context.cloudflare.env.DB
            .prepare("SELECT id FROM currencies WHERE UPPER(code) = 'THB' LIMIT 1")
            .first() as { id?: number } | null;
        if (thbCurrency?.id) {
            await context.cloudflare.env.DB
                .prepare("UPDATE currencies SET company_id = ? WHERE id = ?")
                .bind(company.id, thbCurrency.id)
                .run();
            await context.cloudflare.env.DB
                .prepare("UPDATE currencies SET is_active = 1, updated_at = ? WHERE id = ?")
                .bind(new Date().toISOString(), thbCurrency.id)
                .run();
            await context.cloudflare.env.DB
                .prepare("UPDATE currencies SET company_id = NULL WHERE company_id = ? AND id != ?")
                .bind(company.id, thbCurrency.id)
                .run();
        }
    }

    return {
        user,
        company,
        locations: locations as ListItem[],
        districts: districts as ListItem[],
        paymentTypes: paymentTypes as PaymentType[],
        currencies: (currencies as Currency[]).map((row) => normalizeCurrencyRow(row as unknown as Record<string, unknown>)),
    };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
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

    return handleSettingsAction({
        request,
        context,
        user,
        companyId,
        formData,
    });
}

export default function SettingsPage() {
    const { company, locations, districts, paymentTypes, currencies } = useLoaderData<typeof loader>();
    const [searchParams, setSearchParams] = useSearchParams();
    const submit = useSubmit();
    const activeTab = searchParams.get("tab") || "general";
    const modCompanyId = searchParams.get("modCompanyId");
    const settingsActionUrl = modCompanyId ? `/settings?modCompanyId=${modCompanyId}` : "/settings";
    const initialLocationId = Number(company.locationId ?? locations[0]?.id ?? 0);
    const initialDistrictId = Number(company.districtId ?? 0);
    const [selectedLocationId, setSelectedLocationId] = useState(initialLocationId);
    const [selectedDistrictId, setSelectedDistrictId] = useState(initialDistrictId);
    const [weeklySchedule, setWeeklySchedule] = useState(company.weeklySchedule || "");
    const [holidays, setHolidays] = useState(company.holidays || "");
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPaymentTemplate, setEditingPaymentTemplate] = useState<PaymentType | null>(null);
    const [paymentFormData, setPaymentFormData] = useState({
        name: "",
        sign: "+",
        description: "",
    });
    const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
    const toast = useToast();
    useUrlToast();

    const tabs = [
        { id: "general", label: "General" },
        { id: "payments", label: "Payments" },
        { id: "currencies", label: "Currencies" },
    ];

    const companyLocation = locations.find((location) => Number(location.id) === Number(company.locationId));

    const handleTabChange = (tabId: string | number) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set("tab", String(tabId));
        setSearchParams(nextParams);
    };

    const postWithReload = (entries: Record<string, string>) => {
        submit(entries, { method: "post", action: settingsActionUrl });
    };

    const handleToggleCurrency = (id: number, field: 'isActive' | 'isDefault') => {
        if (field === 'isDefault') {
            postWithReload({
                intent: "setDefaultCurrency",
                currencyId: String(id),
            });
        } else {
            const target = currencies.find((c) => c.id === id);
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
                <GeneralSettingsTab
                    company={company}
                    locations={locations}
                    districts={districts}
                    settingsActionUrl={settingsActionUrl}
                    selectedLocationId={selectedLocationId}
                    selectedDistrictId={selectedDistrictId}
                    onSelectedLocationIdChange={setSelectedLocationId}
                    onSelectedDistrictIdChange={setSelectedDistrictId}
                    weeklySchedule={weeklySchedule}
                    onWeeklyScheduleChange={setWeeklySchedule}
                    holidays={holidays}
                    onHolidaysChange={setHolidays}
                />
            )
            }

            {activeTab === "payments" && (
                <PaymentTemplatesTab
                    paymentTypes={paymentTypes}
                    settingsActionUrl={settingsActionUrl}
                    isPaymentModalOpen={isPaymentModalOpen}
                    editingPaymentTemplate={editingPaymentTemplate}
                    paymentFormData={paymentFormData}
                    setIsPaymentModalOpen={setIsPaymentModalOpen}
                    setEditingPaymentTemplate={setEditingPaymentTemplate}
                    setPaymentFormData={setPaymentFormData}
                />
            )}

            {activeTab === "currencies" && (
                <CurrenciesTab
                    currencies={currencies}
                    companyId={company.id}
                    companyLocationName={companyLocation?.name ? String(companyLocation.name) : null}
                    settingsActionUrl={settingsActionUrl}
                    isCurrencyModalOpen={isCurrencyModalOpen}
                    setIsCurrencyModalOpen={setIsCurrencyModalOpen}
                    onToggleCurrency={handleToggleCurrency}
                    onCurrencyCreated={() => toast.success("Currency added")}
                />
            )}
        </div >
    );
}
