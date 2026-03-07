import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, useSearchParams, useSubmit } from "react-router";
import PageHeader from "~/components/dashboard/PageHeader";
import Tabs from "~/components/dashboard/Tabs";
import Button from "~/components/dashboard/Button";
import { useState } from "react";
import {
    PlusIcon,
} from "@heroicons/react/24/outline";
import { useUrlToast } from "~/lib/useUrlToast";
import { isPhuketName, normalizeCompanyRow, normalizeCurrencyRow } from "~/lib/settings-normalizers";
import type { Currency } from "~/lib/settings-normalizers";
import {
    getCachedCurrenciesDetailed,
    getCachedDistricts,
    getCachedLocations,
    getCachedPaymentTemplatesForCompany,
} from "~/lib/dictionaries-cache.server";
import PaymentTemplatesTab from "~/components/dashboard/settings/PaymentTemplatesTab";
import CurrenciesTab from "~/components/dashboard/settings/CurrenciesTab";
import GeneralSettingsTab from "~/components/dashboard/settings/GeneralSettingsTab";
import { handleSettingsAction } from "~/lib/settings-actions.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useAsyncToastAction } from "~/lib/useAsyncToastAction";

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
import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context);
    const scopedCompanyId = companyId!;

    return trackServerOperation({
        event: "settings.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: scopedCompanyId,
        details: { route: "settings" },
        run: async () => {
            const [companyRow, locations, districts, paymentTypes, currencies] = await Promise.all([
                sdb.db
                    .prepare(`
                        SELECT
                            id, name, email, phone, telegram, location_id, district_id, street, house_number,
                            bank_name, account_number, account_name, swift_code, delivery_fee_after_hours,
                            island_trip_price, krabi_trip_price, baby_seat_price_per_day, weekly_schedule, holidays
                        FROM companies
                        WHERE id = ?
                        LIMIT 1
                    `)
                    .bind(scopedCompanyId)
                    .first() as Promise<CompanyRow | null>,
                getCachedLocations(sdb.db as any),
                getCachedDistricts(sdb.db as any),
                getCachedPaymentTemplatesForCompany(sdb.db as any, scopedCompanyId) as Promise<PaymentType[]>,
                getCachedCurrenciesDetailed(sdb.db as any) as Promise<Currency[]>,
            ]);

            if (!companyRow) {
                throw new Response("Company not found", { status: 404 });
            }
            const company = normalizeCompanyRow(companyRow as Record<string, unknown>) as CompanySettings;

            return {
                user,
                company,
                locations,
                districts,
                paymentTypes: paymentTypes as PaymentType[],
                currencies: (currencies as Currency[]).map((row) => normalizeCurrencyRow(row as unknown as Record<string, unknown>)),
            };
        },
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, adminModCompanyId, sdb } = await getScopedDb(request, context);
    const scopedCompanyId = companyId!;
    const formData = await request.formData();
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

    return trackServerOperation({
        event: "settings.mutate",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: scopedCompanyId,
        details: {
            route: "settings",
            intent: String(formData.get("intent") || "unknown"),
        },
        run: async () => handleSettingsAction({
            request,
            context,
            user,
            companyId: scopedCompanyId,
            formData,
        }),
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
    const { notifySuccess } = useAsyncToastAction();
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
                <Button type="submit" variant="solid" form="settings-form">
                    Save
                </Button>
            );
        }
        if (activeTab === "payments") {
            return (
                <Button
                    variant="solid"
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
                    variant="solid"
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
                    onCurrencyCreated={() => notifySuccess("Currency added")}
                />
            )}
        </div >
    );
}
