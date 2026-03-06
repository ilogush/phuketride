import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAdmin } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import WeeklySchedule from "~/components/dashboard/WeeklySchedule";
import HolidaysManager from "~/components/dashboard/HolidaysManager";
import { useState } from "react";
import { useUrlToast } from "~/lib/useUrlToast";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { QUERY_LIMITS } from "~/lib/query-limits";
import { createCompanyAction } from "~/lib/companies-create.server";
import AssignUsersSection, { type AssignableUser } from "~/components/dashboard/company/AssignUsersSection";
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";

interface LocationRow {
    id: number;
    name: string;
}

interface DistrictRow {
    id: number;
    name: string;
    locationId: number;
    deliveryPrice?: number | null;
}

interface UserRow {
    id: string;
    email: string;
    name: string | null;
    surname: string | null;
    role: string;
    phone: string | null;
}

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAdmin(request);
    const [locationsList, districtsList, usersList] = await Promise.all([
        context.cloudflare.env.DB.prepare(`SELECT id, name FROM locations ORDER BY name ASC LIMIT ${QUERY_LIMITS.LARGE}`).all().then((r: { results?: LocationRow[] }) => r.results || []),
        context.cloudflare.env.DB.prepare(`SELECT id, name, location_id AS locationId, delivery_price AS deliveryPrice FROM districts ORDER BY name ASC LIMIT ${QUERY_LIMITS.XL}`).all().then((r: { results?: DistrictRow[] }) => r.results || []),
        context.cloudflare.env.DB
            .prepare(`
                SELECT id, email, name, surname, role, phone
                FROM users
                WHERE role != 'admin'
                ORDER BY created_at DESC
                LIMIT ${QUERY_LIMITS.XL}
            `)
            .all()
            .then((r: { results?: UserRow[] }) => r.results || []),
    ]);

    return { locations: locationsList, districts: districtsList, users: usersList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAdmin(request);
    const formData = await request.formData();
    return createCompanyAction({ request, context, user, formData });
}

export default function CreateCompanyPage() {
    const { locations, districts, users } = useLoaderData<typeof loader>();
    useUrlToast();
    const { validateLatinInput } = useLatinValidation();
    const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || 1);
    const [weeklySchedule, setWeeklySchedule] = useState("");
    const [holidays, setHolidays] = useState("");
    const [selectedManager, setSelectedManager] = useState<AssignableUser | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    const filteredDistricts = districts.filter((d: DistrictRow) => d.locationId === selectedLocationId);

    const filteredUsers = users.filter((user: UserRow) => {
        if (!searchQuery) return false;
        if (selectedManager?.id === user.id) return false;

        const searchLower = searchQuery.toLowerCase();
        const fullName = `${user.name || ''} ${user.surname || ''}`.toLowerCase();
        return (
            user.email.toLowerCase().includes(searchLower) ||
            fullName.includes(searchLower)
        );
    });

    const handleSelectManager = (user: UserRow) => {
        setSelectedManager(user);
        setSearchQuery("");
        setShowSuggestions(false);
    };

    const handleRemoveManager = () => {
        setSelectedManager(null);
    };

    return (
        <div className="space-y-4">
            <PageHeader
                title="Add New Company"
                leftActions={<BackButton to="/companies" />}
                rightActions={
                    <Button type="submit" variant="primary" form="company-form">
                        Create
                    </Button>
                }
            />

            <Form id="company-form" method="post" className="space-y-4">
                {/* Basic Information */}
                <FormSection title="Company Information" icon={<BuildingOfficeIcon />}>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input
                                label="Company Name"
                                name="name"
                                placeholder="e.g., Andaman Rentals"
                                required
                                onChange={(e) => validateLatinInput(e, 'Company Name')}
                            />
                            <Input
                                label="Email Address"
                                name="email"
                                type="email"
                                placeholder="company@example.com"
                                required
                            />
                            <Input
                                label="Phone Number"
                                name="phone"
                                placeholder="+66..."
                                required
                            />
                            <Input
                                label="Telegram"
                                name="telegram"
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
                                defaultValue={filteredDistricts[0]?.id.toString()}
                                options={filteredDistricts}
                                required
                            />
                            <Input
                                label="Street"
                                name="street"
                                placeholder="e.g., 123 Beach Road"
                                required
                                onChange={(e) => validateLatinInput(e, 'Street')}
                            />
                            <Input
                                label="House Number"
                                name="houseNumber"
                                placeholder="e.g., 45/1"
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
                            placeholder="e.g., Bangkok Bank"
                        />
                        <Input
                            label="Account Number"
                            name="accountNumber"
                            placeholder="e.g., 123-456-7890"
                        />
                        <Input
                            label="Account Name"
                            name="accountName"
                            placeholder="e.g., Company Ltd."
                        />
                        <Input
                            label="SWIFT / BIC Code"
                            name="swiftCode"
                            placeholder="e.g., BKKBTHBK"
                        />
                    </div>
                </FormSection>

                {/* Extras */}
                <FormSection title="Extras" icon={<Cog6ToothIcon />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Delivery Fee (After Hours)"
                            name="deliveryFeeAfterHours"
                            type="number"
                            step="0.01"

                            addonLeft="฿"
                        />
                        <Input
                            label="Island Trip Cost"
                            name="islandTripPrice"
                            type="number"
                            step="0.01"

                            addonLeft="฿"
                        />
                        <Input
                            label="Krabi Trip Cost"
                            name="krabiTripPrice"
                            type="number"
                            step="0.01"

                            addonLeft="฿"
                        />
                        <Input
                            label="Baby Seat Cost (per day)"
                            name="babySeatPricePerDay"
                            type="number"
                            step="1"
                            min={0}

                            addonLeft="฿"
                        />
                    </div>
                </FormSection>

                <AssignUsersSection
                    selectedManager={selectedManager}
                    searchQuery={searchQuery}
                    showSuggestions={showSuggestions}
                    filteredUsers={filteredUsers}
                    onSearchQueryChange={(value) => {
                        setSearchQuery(value);
                        setShowSuggestions(true);
                    }}
                    onFocusSearch={() => setShowSuggestions(true)}
                    onSelectManager={handleSelectManager}
                    onRemoveManager={handleRemoveManager}
                />

                {/* Weekly Schedule */}
                <input type="hidden" name="weeklySchedule" value={weeklySchedule} />
                <WeeklySchedule value={weeklySchedule} onChange={setWeeklySchedule} />

                {/* Holidays */}
                <input type="hidden" name="holidays" value={holidays} />
                <HolidaysManager value={holidays} onChange={setHolidays} />
            </Form>
        </div >
    );
}
