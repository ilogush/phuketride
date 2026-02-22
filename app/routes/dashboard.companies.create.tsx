import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useSearchParams } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import PageHeader from "~/components/dashboard/PageHeader";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import Button from "~/components/dashboard/Button";
import BackButton from "~/components/dashboard/BackButton";
import FormSection from "~/components/dashboard/FormSection";
import ReadOnlyField from "~/components/dashboard/ReadOnlyField";
import WeeklySchedule from "~/components/dashboard/WeeklySchedule";
import HolidaysManager from "~/components/dashboard/HolidaysManager";
import { useState, useEffect } from "react";
import { useToast } from "~/lib/toast";
import { companySchema } from "~/schemas/company";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { useLatinValidation } from "~/lib/useLatinValidation";
import {
    BuildingOfficeIcon,
    BanknotesIcon,
    Cog6ToothIcon,
    UserIcon,
} from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const [locationsList, districtsList, usersList] = await Promise.all([
        context.cloudflare.env.DB.prepare("SELECT * FROM locations ORDER BY name ASC LIMIT 100").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB.prepare("SELECT * FROM districts ORDER BY name ASC LIMIT 200").all().then((r: any) => r.results || []),
        context.cloudflare.env.DB
            .prepare(`
                SELECT id, email, name, surname, role, phone
                FROM users
                WHERE role != 'admin'
                ORDER BY created_at DESC
                LIMIT 200
            `)
            .all()
            .then((r: any) => r.results || []),
    ]);

    return { locations: locationsList, districts: districtsList, users: usersList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const formData = await request.formData();

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

    // Parse form data
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
        return redirect(`/companies/create?error=${encodeURIComponent(firstError.message)}`);
    }

    const validData = validation.data;

    try {
        // Schedule & Holidays
        const weeklySchedule = formData.get("weeklySchedule") as string;
        const holidays = formData.get("holidays") as string;
        const managerIds = formData.getAll("managerIds") as string[];

        // Create company
        const insertResult = await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO companies (
                    name, owner_id, email, phone, telegram, location_id, district_id,
                    street, house_number, bank_name, account_number, account_name, swift_code,
                    preparation_time, delivery_fee_after_hours, island_trip_price, krabi_trip_price,
                    baby_seat_price_per_day, weekly_schedule, holidays, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
                validData.name,
                user.id,
                validData.email,
                validData.phone,
                validData.telegram,
                validData.locationId,
                validData.districtId,
                validData.street,
                validData.houseNumber,
                validData.bankName,
                validData.accountNumber,
                validData.accountName,
                validData.swiftCode,
                validData.preparationTime,
                validData.deliveryFeeAfterHours,
                validData.islandTripPrice,
                validData.krabiTripPrice,
                validData.babySeatPricePerDay,
                weeklySchedule,
                holidays,
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();
        const newCompany = { id: Number(insertResult.meta.last_row_id) };

        if (!newCompany?.id) {
            throw new Error("Failed to create company - no ID returned");
        }

        // Create delivery settings for all districts in the location
        const allDistrictsResult = await context.cloudflare.env.DB
            .prepare("SELECT id, delivery_price AS deliveryPrice FROM districts WHERE location_id = ?")
            .bind(validData.locationId)
            .all() as { results?: any[] };
        const allDistricts = allDistrictsResult.results || [];
        
        await Promise.all(
            allDistricts.map(district =>
                context.cloudflare.env.DB
                    .prepare(`
                        INSERT INTO company_delivery_settings (
                            company_id, district_id, is_active, delivery_price, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?)
                    `)
                    .bind(
                        newCompany.id,
                        district.id,
                        district.id === validData.districtId ? 1 : 0,
                        district.id === validData.districtId ? 0 : (district.deliveryPrice || 0),
                        new Date().toISOString(),
                        new Date().toISOString()
                    )
                    .run()
            )
        );

        // Assign managers and update their role to partner
        if (managerIds.length > 0 && newCompany?.id) {
            // First manager becomes the owner
            const ownerId = managerIds[0];
            
            // Update company owner
            await context.cloudflare.env.DB
                .prepare("UPDATE companies SET owner_id = ?, updated_at = ? WHERE id = ?")
                .bind(ownerId, new Date().toISOString(), newCompany.id)
                .run();

            // Create manager records and update roles
            await Promise.all([
                ...managerIds.map(userId =>
                    context.cloudflare.env.DB
                        .prepare(`
                            INSERT INTO managers (user_id, company_id, is_active, created_at, updated_at)
                            VALUES (?, ?, 1, ?, ?)
                        `)
                        .bind(userId, newCompany.id, new Date().toISOString(), new Date().toISOString())
                        .run()
                ),
                ...managerIds.map(userId =>
                    context.cloudflare.env.DB
                        .prepare("UPDATE users SET role = 'partner', updated_at = ? WHERE id = ?")
                        .bind(new Date().toISOString(), userId)
                        .run()
                )
            ]);
        } else if (!managerIds.length) {
            // No manager selected - admin remains as temporary owner
        }

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: newCompany.id,
            entityType: "company",
            entityId: newCompany.id,
            action: "create",
            afterState: { ...validData, id: newCompany.id },
            ...metadata,
        });

        return redirect(`/companies?success=${encodeURIComponent("Company created successfully")}`);
    } catch {
        return redirect(`/companies/create?error=${encodeURIComponent("Failed to create company")}`);
    }
}

export default function CreateCompanyPage() {
    const { locations, districts, users } = useLoaderData<typeof loader>();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const { validateLatinInput } = useLatinValidation();
    const [selectedLocationId, setSelectedLocationId] = useState(locations[0]?.id || 1);
    const [weeklySchedule, setWeeklySchedule] = useState("");
    const [holidays, setHolidays] = useState("");
    const [selectedManager, setSelectedManager] = useState<{ id: string; email: string; name: string | null; surname: string | null; role: string; phone: string | null } | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

    const filteredDistricts = districts.filter(d => d.locationId === selectedLocationId);

    const filteredUsers = users.filter(user => {
        if (!searchQuery) return false;
        if (selectedManager?.id === user.id) return false;

        const searchLower = searchQuery.toLowerCase();
        const fullName = `${user.name || ''} ${user.surname || ''}`.toLowerCase();
        return (
            user.email.toLowerCase().includes(searchLower) ||
            fullName.includes(searchLower)
        );
    });

    const handleSelectManager = (user: typeof users[0]) => {
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
                            label="Preparation Time (min)"
                            name="preparationTime"
                            type="number"
                            placeholder="30"
                            defaultValue="30"
                        />
                        <Input
                            label="Delivery Fee (After Hours)"
                            name="deliveryFeeAfterHours"
                            type="number"
                            step="0.01"
                            placeholder="0"
                            addonLeft="฿"
                        />
                        <Input
                            label="Island Trip Cost"
                            name="islandTripPrice"
                            type="number"
                            step="0.01"
                            placeholder="0"
                            addonLeft="฿"
                        />
                        <Input
                            label="Krabi Trip Cost"
                            name="krabiTripPrice"
                            type="number"
                            step="0.01"
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
                                placeholder="0"
                                addonLeft="฿"
                            />
                    </div>
                </FormSection>

                {/* Assign Managers */}
                <FormSection title="Assign Users" icon={<UserIcon />}>
                    <div className="space-y-4">
                        {!selectedManager ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="relative">
                                    <Input
                                        label="Search Users"
                                        name="userSearch"
                                        placeholder="Type email or name..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        autoComplete="off"
                                    />

                                    {showSuggestions && searchQuery && filteredUsers.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white rounded-xl shadow-lg max-h-60 overflow-y-auto">
                                            {filteredUsers.slice(0, 10).map((user) => (
                                                <Button
                                                    key={user.id}
                                                    type="button"
                                                    variant="unstyled"
                                                    onClick={() => handleSelectManager(user)}
                                                    className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                                                >
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {user.name && user.surname
                                                            ? `${user.name} ${user.surname}`
                                                            : user.email}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {user.email} • {user.role}
                                                    </div>
                                                </Button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <input type="hidden" name="managerIds" value={selectedManager.id} />
                                <div className="flex items-center justify-between mb-4">
                                    <label className="block text-xs text-gray-600">Assigned User</label>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleRemoveManager}
                                    >
                                        Remove
                                    </Button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <ReadOnlyField label="Name" value={selectedManager.name} />
                                    <ReadOnlyField label="Surname" value={selectedManager.surname} />
                                    <ReadOnlyField label="Email" value={selectedManager.email} />
                                    <ReadOnlyField label="Phone" value={selectedManager.phone} />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <ReadOnlyField label="Role" value={selectedManager.role} capitalize />
                                </div>
                            </div>
                        )}
                    </div>
                </FormSection>

                {/* Weekly Schedule */}
                <input type="hidden" name="weeklySchedule" value={weeklySchedule} />
                <WeeklySchedule value={weeklySchedule} onChange={setWeeklySchedule} />

                {/* Holidays */}
                <input type="hidden" name="holidays" value={holidays} />
                <HolidaysManager value={holidays} onChange={setHolidays} />
            </Form>
        </div>
    );
}
