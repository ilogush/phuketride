import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import PageHeader from '~/components/shared/ui/PageHeader';
import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import Button from '~/components/shared/ui/Button';
import BackButton from '~/components/shared/ui/BackButton';
import FormSection from '~/components/shared/ui/FormSection';
import WeeklySchedule from "~/components/dashboard/WeeklySchedule";
import HolidaysManager from "~/components/dashboard/HolidaysManager";
import { useState } from "react";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { createCompanyAction } from "~/lib/companies-create.server";
import AssignUsersSection, { type AssignableUser } from "~/components/dashboard/company/AssignUsersSection";
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useCompanyManagerAssignment } from "~/components/dashboard/company/useCompanyManagerAssignment";
import { checkRateLimit, getClientIdentifier } from "~/lib/rate-limit.server";

type DistrictRow = {
    id: number;
    name: string;
    locationId: number;
    deliveryPrice?: number | null;
};

import { requireAdminUserMutationAccess } from "~/lib/access-policy.server";
import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireAdminUserMutationAccess);
    return trackServerOperation({
        event: "companies.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "companies.create" },
        run: async () => sdb.companies.getCreateData(),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireAdminUserMutationAccess);

    // Rate-limit company creation
    const rateLimit = await checkRateLimit(
        (context.cloudflare.env as { RATE_LIMIT?: KVNamespace }).RATE_LIMIT,
        getClientIdentifier(request, user.id),
        "form"
    );
    if (!rateLimit.allowed) {
        return { error: "Too many requests. Please wait and try again." };
    }

    return trackServerOperation({
        event: "companies.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: null,
        run: async () => {
            const formData = await request.formData();
            return createCompanyAction({ request, context, user, formData, db: sdb.rawDb });
        },
    });
}

export default function CreateCompanyPage() {
    const { locations, districts, users } = useLoaderData<typeof loader>();
    const { validateLatinInput } = useLatinValidation();
    const [weeklySchedule, setWeeklySchedule] = useState("");
    const [holidays, setHolidays] = useState("");
    const {
        selectedLocationId,
        setSelectedLocationId,
        selectedManager,
        searchQuery,
        showSuggestions,
        filteredUsers,
        setSearchQuery,
        setShowSuggestions,
        handleSelectManager,
        handleRemoveManager,
    } = useCompanyManagerAssignment(users as AssignableUser[], locations[0]?.id || 1);
    const filteredDistricts = districts.filter((d: DistrictRow) => d.locationId === selectedLocationId);

    return (
        <div className="space-y-4">
            <PageHeader
                title="Add New Company"
                leftSlot={<BackButton to="/companies" />}
                rightSlot={
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
                            startAdornment="฿"
                        />
                        <Input
                            label="Island Trip Cost"
                            name="islandTripPrice"
                            type="number"
                            step="0.01"
                            startAdornment="฿"
                        />
                        <Input
                            label="Krabi Trip Cost"
                            name="krabiTripPrice"
                            type="number"
                            step="0.01"
                            startAdornment="฿"
                        />
                        <Input
                            label="Baby Seat Cost (per day)"
                            name="babySeatPricePerDay"
                            type="number"
                            step="1"
                            min={0}
                            startAdornment="฿"
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
