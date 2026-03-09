import { Form } from "react-router";
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import FormSection from '~/components/shared/ui/FormSection';
import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import WeeklySchedule from "~/components/dashboard/WeeklySchedule";
import HolidaysManager from "~/components/dashboard/HolidaysManager";
import { useLatinValidation } from "~/lib/useLatinValidation";

type CompanySettings = {
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
};

type ListItem = {
    id: number;
    name: string;
    locationId?: number | string | null;
    location_id?: number | string | null;
};

type Props = {
    company: CompanySettings;
    locations: ListItem[];
    districts: ListItem[];
    settingsActionUrl: string;
    selectedLocationId: number;
    selectedDistrictId: number;
    onSelectedLocationIdChange: (value: number) => void;
    onSelectedDistrictIdChange: (value: number) => void;
    weeklySchedule: string;
    onWeeklyScheduleChange: (value: string) => void;
    holidays: string;
    onHolidaysChange: (value: string) => void;
};

export default function GeneralSettingsTab({
    company,
    locations,
    districts,
    settingsActionUrl,
    selectedLocationId,
    selectedDistrictId,
    onSelectedLocationIdChange,
    onSelectedDistrictIdChange,
    weeklySchedule,
    onWeeklyScheduleChange,
    holidays,
    onHolidaysChange,
}: Props) {
    const { validateLatinInput } = useLatinValidation();
    const filteredDistricts = districts.filter((d) => Number(d.locationId ?? d.location_id) === Number(selectedLocationId));

    return (
        <Form id="settings-form" method="post" action={settingsActionUrl} className="space-y-4" reloadDocument>
            <input type="hidden" name="intent" value="updateGeneral" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
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
                                    value={String(selectedLocationId || "")}
                                    onChange={(e) => {
                                        const nextLocationId = Number(e.target.value) || 0;
                                        onSelectedLocationIdChange(nextLocationId);
                                        const firstDistrict = districts.find(
                                            (d) => Number(d.locationId ?? d.location_id) === nextLocationId
                                        );
                                        onSelectedDistrictIdChange(Number(firstDistrict?.id ?? 0));
                                    }}
                                    options={locations}
                                    required
                                />
                                <Select
                                    label="District"
                                    name="districtId"
                                    value={String(selectedDistrictId || "")}
                                    onChange={(e) => onSelectedDistrictIdChange(Number(e.target.value) || 0)}
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

                    <FormSection title="Extras" icon={<Cog6ToothIcon />}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Input
                                label="Delivery Fee (After Hours)"
                                name="deliveryFeeAfterHours"
                                type="number"
                                step="0.01"
                                defaultValue={company.deliveryFeeAfterHours?.toString() || "0"}
                                startAdornment="฿"
                            />
                            <Input
                                label="Island Trip Cost"
                                name="islandTripPrice"
                                type="number"
                                step="0.01"
                                defaultValue={company.islandTripPrice?.toString() || "0"}
                                startAdornment="฿"
                            />
                            <Input
                                label="Krabi Trip Cost"
                                name="krabiTripPrice"
                                type="number"
                                step="0.01"
                                defaultValue={company.krabiTripPrice?.toString() || "0"}
                                startAdornment="฿"
                            />
                            <Input
                                label="Baby Seat Cost (per day)"
                                name="babySeatPricePerDay"
                                type="number"
                                step="1"
                                min={0}
                                defaultValue={Math.max(0, Math.round(company.babySeatPricePerDay ?? 0)).toString()}
                                startAdornment="฿"
                            />
                        </div>
                    </FormSection>

                    <input type="hidden" name="weeklySchedule" value={weeklySchedule} />
                    <WeeklySchedule value={weeklySchedule} onChange={onWeeklyScheduleChange} />
                </div>

                <div className="space-y-4 lg:sticky lg:top-4 h-fit">
                    <input type="hidden" name="holidays" value={holidays} />
                    <HolidaysManager value={holidays} onChange={onHolidaysChange} />
                </div>
            </div>
        </Form>
    );
}
