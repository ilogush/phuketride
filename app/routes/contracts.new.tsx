import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { Input } from "~/components/dashboard/Input";
import { Textarea } from "~/components/dashboard/Textarea";
import Toggle from "~/components/dashboard/Toggle";
import DocumentPhotosUpload from "~/components/dashboard/DocumentPhotosUpload";
import CarPhotosUpload from "~/components/dashboard/CarPhotosUpload";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { useDateMasking } from "~/lib/useDateMasking";
import { useUrlToast } from "~/lib/useUrlToast";
import { parseDateFromDisplay } from "~/lib/formatters";
import { getRequestMetadata } from "~/lib/audit-logger";
import { getUpdateCarStatusStmt } from "~/lib/contract-helpers.server";
import { getCreateContractEventsStmts } from "~/lib/calendar-events.server";
import { getQuickAuditStmt } from "~/lib/audit-logger";
import {
    EXTRA_TYPES,
    getCreateExtraPaymentStmt,
    getCurrencyCodeById,
    getExtraFlagsFromFormData,
    getExtraInputFromFormData,
} from "~/lib/contract-extras.server";
import {
    TruckIcon,
    CalendarIcon,
    UserIcon,
    CubeIcon,
    BanknotesIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const companyId = user.companyId ?? null;
    const [cars, districtsList, currencies] = await Promise.all([
        context.cloudflare.env.DB
            .prepare(`
                SELECT
                    cc.id,
                    cc.price_per_day AS pricePerDay,
                    cc.deposit,
                    cc.license_plate AS licensePlate,
                    cb.name AS brandName,
                    cm.name AS modelName
                FROM company_cars cc
                LEFT JOIN car_templates ct ON ct.id = cc.template_id
                LEFT JOIN car_brands cb ON cb.id = ct.brand_id
                LEFT JOIN car_models cm ON cm.id = ct.model_id
                WHERE cc.company_id = ? AND cc.status = 'available' AND cc.archived_at IS NULL
            `)
            .bind(companyId)
            .all()
            .then((r: any) => r.results || []),
        context.cloudflare.env.DB
            .prepare("SELECT id, name, name_en FROM districts WHERE is_active = 1")
            .all()
            .then((r: any) => r.results || []),
        context.cloudflare.env.DB
            .prepare("SELECT id, code, symbol FROM currencies WHERE is_active = 1 AND (company_id IS NULL OR company_id = ?)")
            .bind(companyId)
            .all()
            .then((r: any) => r.results || []),
    ]);

    return {
        cars: cars.map((car: any) => ({
            id: car.id,
            name: `${car.brandName || ""} ${car.modelName || ""} - ${car.licensePlate}`,
            pricePerDay: car.pricePerDay,
            deposit: car.deposit,
        })),
        districts: districtsList.map((d: any) => ({ id: d.id, name: d.name_en || d.name })),
        currencies,
    };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();

    try {
        const parseDocPhotos = (value: FormDataEntryValue | null): Array<{ base64: string; fileName: string }> => {
            if (typeof value !== "string") return [];
            const trimmed = value.trim();
            if (!trimmed) return [];
            try {
                const parsed = JSON.parse(trimmed);
                if (!Array.isArray(parsed)) return [];
                return parsed.filter((p) => p && typeof p.base64 === "string" && typeof p.fileName === "string");
            } catch {
                return [];
            }
        };

        const passportPhotosValue = parseDocPhotos(formData.get("passportPhotos"));
        const driverLicensePhotosValue = parseDocPhotos(formData.get("driverLicensePhotos"));

        // Parse client data
        const passportNumber = String(formData.get("client_passport") || "").trim();
        if (!passportNumber) {
            throw new Error("Client passport is required");
        }
        const clientData = {
            name: String(formData.get("client_name") || "").trim(),
            surname: String(formData.get("client_surname") || "").trim(),
            email: String(formData.get("client_email") || "").trim(),
            phone: String(formData.get("client_phone") || "").trim(),
            whatsapp: String(formData.get("client_whatsapp") || "").trim(),
            telegram: String(formData.get("client_telegram") || "").trim(),
            dateOfBirth: formData.get("date_of_birth") ? new Date(parseDateFromDisplay(String(formData.get("date_of_birth")))) : null,
        };
        if (!clientData.name || !clientData.surname || !clientData.phone) {
            throw new Error("Client name, surname and phone are required");
        }

        // Check if client exists by passport_number
        let clientId: string;
        const existingClient = await context.cloudflare.env.DB
            .prepare(`
                SELECT id, email, name, surname, phone, passport_photos AS passportPhotos,
                       driver_license_photos AS driverLicensePhotos
                FROM users
                WHERE passport_number = ?
                LIMIT 1
            `)
            .bind(passportNumber)
            .first() as any;

        const userStmts: D1PreparedStatement[] = [];
        if (existingClient) {
            clientId = existingClient.id;
            const dataMatches =
                existingClient.name === clientData.name &&
                existingClient.surname === clientData.surname &&
                (!clientData.email || existingClient.email === clientData.email) &&
                existingClient.phone === clientData.phone;

            if (!dataMatches || passportPhotosValue.length > 0 || driverLicensePhotosValue.length > 0) {
                userStmts.push(
                    context.cloudflare.env.DB
                        .prepare(`
                            UPDATE users
                            SET passport_photos = ?, driver_license_photos = ?, updated_at = ?
                            WHERE id = ?
                        `)
                        .bind(
                            passportPhotosValue.length > 0 ? JSON.stringify(passportPhotosValue) : existingClient.passportPhotos,
                            driverLicensePhotosValue.length > 0 ? JSON.stringify(driverLicensePhotosValue) : existingClient.driverLicensePhotos,
                            new Date().toISOString(),
                            clientId
                        )
                );
            }
        } else {
            clientId = crypto.randomUUID();
            userStmts.push(
                context.cloudflare.env.DB
                    .prepare(`
                        INSERT INTO users (
                            id, email, role, name, surname, phone, whatsapp, telegram, passport_number,
                            date_of_birth, passport_photos, driver_license_photos, created_at, updated_at
                        ) VALUES (?, ?, 'user', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `)
                    .bind(
                        clientId,
                        clientData.email || `${clientData.phone}@temp.com`,
                        clientData.name,
                        clientData.surname,
                        clientData.phone,
                        clientData.whatsapp || null,
                        clientData.telegram || null,
                        passportNumber,
                        clientData.dateOfBirth ? clientData.dateOfBirth.toISOString() : null,
                        passportPhotosValue.length > 0 ? JSON.stringify(passportPhotosValue) : null,
                        driverLicensePhotosValue.length > 0 ? JSON.stringify(driverLicensePhotosValue) : null,
                        new Date().toISOString(),
                        new Date().toISOString()
                    )
            );
        }

        if (userStmts.length > 0) {
            await context.cloudflare.env.DB.batch(userStmts);
        }

        // Parse contract data
        const companyCarId = Number(formData.get("company_car_id"));

        // Use a more flexible parser for DD/MM/YYYY HH:mm
        const parseDateTime = (val: string) => {
            const parts = val.split(/[\s/:]/);
            if (parts.length < 3) return new Date(val);
            const [d, m, y, h, min] = parts.map(Number);
            return new Date(y, m - 1, d, h || 0, min || 0);
        };

        const startDate = parseDateTime(String(formData.get("start_date")));
        const endDate = parseDateTime(String(formData.get("end_date")));
        const totalAmount = Number(formData.get("total_amount"));
        const depositAmount = Number(formData.get("deposit_amount")) || 0;
        const totalCurrency = "THB";

        if (!Number.isFinite(companyCarId) || companyCarId <= 0) {
            throw new Error("Car is required");
        }
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error("Start and end dates are required");
        }
        if (startDate >= endDate) {
            throw new Error("End date must be after start date");
        }
        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            throw new Error("Total amount must be greater than 0");
        }

        // SECURITY: Verify car belongs to user's company
        const car = await context.cloudflare.env.DB
            .prepare(`
                SELECT id, status
                FROM company_cars
                WHERE id = ? AND company_id = ?
                LIMIT 1
            `)
            .bind(companyCarId, user.companyId)
            .first() as any;

        if (!car) {
            throw new Error("Car not found or doesn't belong to your company");
        }

        if (car.status !== 'available') {
            throw new Error("Car is not available for rent");
        }

        // Check for overlapping contracts
        const overlapping = await context.cloudflare.env.DB
            .prepare(`
                SELECT id
                FROM contracts
                WHERE company_car_id = ? AND status = 'active'
                  AND (
                    (start_date <= ? AND end_date >= ?)
                    OR (start_date <= ? AND end_date >= ?)
                    OR (start_date >= ? AND end_date <= ?)
                  )
                LIMIT 1
            `)
            .bind(
                companyCarId,
                startDate.toISOString(),
                startDate.toISOString(),
                endDate.toISOString(),
                endDate.toISOString(),
                startDate.toISOString(),
                endDate.toISOString()
            )
            .first() as any;

        if (overlapping) {
            throw new Error("Car is already booked for these dates");
        }

        const parsePhotoList = (value: FormDataEntryValue | null): string[] => {
            if (typeof value !== "string") return [];
            const trimmed = value.trim();
            if (!trimmed) return [];
            try {
                const parsed = JSON.parse(trimmed);
                if (!Array.isArray(parsed)) return [];
                return parsed.filter((p) => typeof p === "string" && p.trim().length > 0);
            } catch {
                return [];
            }
        };

        const contractPhotosValue = parsePhotoList(formData.get("photos"));
        const pickupDistrictId = formData.get("pickup_district_id") ? Number(formData.get("pickup_district_id")) : null;
        const returnDistrictId = formData.get("return_district_id") ? Number(formData.get("return_district_id")) : null;

        const deliveryCost = Number(formData.get("delivery_cost")) || 0;
        const returnCost = Number(formData.get("return_cost")) || 0;
        const fuelLevel = String(formData.get("fuel_level") || "Full");
        const cleanliness = String(formData.get("cleanliness") || "Clean");
        const startMileage = Number(formData.get("start_mileage")) || 0;
        const extraFlags = getExtraFlagsFromFormData(formData);

        // Create
        const contractInsert = await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO contracts (
                    company_car_id, client_id, manager_id, start_date, end_date, total_amount, total_currency,
                    deposit_amount, deposit_currency, deposit_payment_method,
                    pickup_district_id, pickup_hotel, pickup_room, delivery_cost, return_district_id, return_hotel, return_room, return_cost,
                    start_mileage, fuel_level, cleanliness, status, notes, photos, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?)
            `)
            .bind(
                companyCarId,
                clientId,
                user.id,
                startDate.toISOString(),
                endDate.toISOString(),
                totalAmount,
                totalCurrency,
                depositAmount,
                totalCurrency,
                (formData.get("deposit_payment_method") as string) || null,
                pickupDistrictId,
                (formData.get("pickup_hotel") as string) || null,
                (formData.get("pickup_room") as string) || null,
                deliveryCost,
                returnDistrictId,
                (formData.get("return_hotel") as string) || null,
                (formData.get("return_room") as string) || null,
                returnCost,
                startMileage,
                fuelLevel,
                cleanliness,
                (formData.get("notes") as string) || null,
                contractPhotosValue.length > 0 ? JSON.stringify(contractPhotosValue) : null,
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();

        const contractId = Number(contractInsert.meta.last_row_id);
        const currencyCodeById = await getCurrencyCodeById(context.cloudflare.env.DB);

        // Prep batch 2: Payments, Car Status, Calendar Events
        const finalStmts: D1PreparedStatement[] = [];

        // Create extra services as payment records
        for (const extraType of EXTRA_TYPES) {
            const enabled = extraFlags[extraType];
            if (!enabled) continue;
            const { amount, currencyId, paymentMethod } = getExtraInputFromFormData(formData, extraType);
            const currencyCode = (currencyId ? currencyCodeById.get(currencyId) : null) || "THB";
            finalStmts.push(getCreateExtraPaymentStmt({
                db: context.cloudflare.env.DB,
                contractId,
                userId: user.id,
                extraType,
                amount,
                currency: currencyCode,
                currencyId,
                paymentMethod,
            }));
        }

        // Update car status to 'rented'
        finalStmts.push(getUpdateCarStatusStmt(context.cloudflare.env.DB, companyCarId, 'rented'));

        // Create calendar events
        finalStmts.push(...getCreateContractEventsStmts({
            db: context.cloudflare.env.DB,
            companyId: user.companyId!,
            contractId: contractId,
            startDate,
            endDate,
            createdBy: user.id,
        }));

        // Execute batch 2
        await context.cloudflare.env.DB.batch(finalStmts);

        // Audit log (immediate execution)
        const metadata = getRequestMetadata(request);
        await getQuickAuditStmt({
            db: context.cloudflare.env.DB,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "contract",
            entityId: contractId,
            action: "create",
            afterState: { contractId: contractId, clientId, companyCarId },
            ...metadata,
        }).run();

        return redirect(`/contracts?success=${encodeURIComponent("Contract created successfully")}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to Create";
        return redirect(`/contracts/new?error=${encodeURIComponent(message)}`);
    }
}

export default function NewContract() {
    const { cars, districts, currencies } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    useUrlToast();
    const { validateLatinInput } = useLatinValidation();
    const { maskDateInput, maskDateTimeInput } = useDateMasking();

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000));
    const [fullInsurance, setFullInsurance] = useState(false);
    const [islandTrip, setIslandTrip] = useState(false);
    const [krabiTrip, setKrabiTrip] = useState(false);
    const [babySeat, setBabySeat] = useState(false);
    const [carPhotos, setCarPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [passportPhotos, setPassportPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [driverLicensePhotos, setDriverLicensePhotos] = useState<Array<{ base64: string; fileName: string }>>([]);

    const fuelLevels = [
        { id: "Full", name: "Full (8/8)" },
        { id: "7/8", name: "7/8 (87.5%)" },
        { id: "6/8", name: "6/8 (75%)" },
        { id: "5/8", name: "5/8 (62.5%)" },
        { id: "Half", name: "Half (4/8)" },
        { id: "3/8", name: "3/8 (37.5%)" },
        { id: "2/8", name: "2/8 (25%)" },
        { id: "1/8", name: "1/8 (12.5%)" },
        { id: "Empty", name: "Empty" },
    ];

    const cleanlinessOptions = [
        { id: "Clean", name: "Clean" },
        { id: "Dirty", name: "Dirty" },
    ];

    const genderOptions = [
        { id: "male", name: "Male" },
        { id: "female", name: "Female" },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title="New Contract"
                leftActions={<BackButton />}
                rightActions={
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => navigate("/contracts")}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" form="new-contract-form">
                            Create
                        </Button>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Main Form - Left Side */}
                <div className="lg:col-span-2 space-y-4">
                    <Form id="new-contract-form" method="post" className="space-y-4">
                        <input type="hidden" name="passportPhotos" value={JSON.stringify(passportPhotos)} />
                        <input type="hidden" name="driverLicensePhotos" value={JSON.stringify(driverLicensePhotos)} />
                        <input type="hidden" name="photos" value={JSON.stringify(carPhotos.map((p) => p.base64))} />
                        <input type="hidden" name="fullInsurance" value={fullInsurance ? "true" : "false"} />
                        <input type="hidden" name="islandTrip" value={islandTrip ? "true" : "false"} />
                        <input type="hidden" name="krabiTrip" value={krabiTrip ? "true" : "false"} />
                        <input type="hidden" name="babySeat" value={babySeat ? "true" : "false"} />
                        
                        {/* Car Details */}
                        <FormSection
                            title="Car Details"
                            icon={<TruckIcon className="w-6 h-6" />}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormSelect
                                    label="Car"
                                    name="company_car_id"
                                    options={cars}
                                    placeholder="Select car"
                                    required
                                />
                                <FormInput
                                    label="Start Mileage"
                                    name="start_mileage"
                                    type="number"
                                    required
                                />
                                <FormSelect
                                    label="Fuel Level"
                                    name="fuel_level"
                                    options={fuelLevels}
                                    defaultValue="Full"
                                    required
                                />
                                <FormSelect
                                    label="Cleanliness"
                                    name="cleanliness"
                                    options={cleanlinessOptions}
                                    defaultValue="Clean"
                                    required
                                />
                            </div>
                        </FormSection>

                        {/* Rental Details */}
                        <FormSection
                            title="Rental Details"
                            icon={<CalendarIcon className="w-6 h-6" />}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Input
                                    label="Start Date & Time"
                                    type="text"
                                    name="start_date"
                                    required
                                    placeholder="DD/MM/YYYY HH:mm"
                                    onChange={maskDateTimeInput}
                                />
                                <FormSelect
                                    label="Pickup District"
                                    name="pickup_district_id"
                                    options={districts}
                                    placeholder="Select district"
                                    required
                                />
                                <FormInput
                                    label="Hotel"
                                    name="pickup_hotel"
                                    placeholder="Type or select hotel..."
                                />
                                <FormInput
                                    label="Room Number"
                                    name="pickup_room"
                                    placeholder="Room..."
                                />
                                <Input
                                    label="End Date & Time"
                                    type="text"
                                    name="end_date"
                                    required
                                    placeholder="DD/MM/YYYY HH:mm"
                                    onChange={maskDateTimeInput}
                                />
                                <FormSelect
                                    label="Return District"
                                    name="return_district_id"
                                    options={districts}
                                    placeholder="Select district"
                                    required
                                />
                                <FormInput
                                    label="Return Hotel"
                                    name="return_hotel"
                                    placeholder="Type or select return hotel..."
                                />
                                <FormInput
                                    label="Return Room Number"
                                    name="return_room"
                                    placeholder="Room..."
                                />
                            </div>
                        </FormSection>

                        {/* User Details */}
                        <FormSection
                            title="User Details"
                            icon={<UserIcon className="w-6 h-6" />}
                        >
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <FormInput
                                    label="Passport Number"
                                    name="client_passport"
                                    placeholder="Passport ID"
                                    required
                                />
                                <FormInput
                                    label="First Name"
                                    name="client_name"
                                    placeholder="John"
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, 'First Name')}
                                    required
                                />
                                <FormInput
                                    label="Last Name"
                                    name="client_surname"
                                    placeholder="Doe"
                                    pattern="[a-zA-Z\s\-']+"
                                    onChange={(e) => validateLatinInput(e, 'Last Name')}
                                    required
                                />
                                <FormInput
                                    label="Birth Date"
                                    name="date_of_birth"
                                    type="text"
                                    placeholder="DD/MM/YYYY"
                                    onChange={maskDateInput}
                                />
                                <FormInput
                                    label="Phone"
                                    name="client_phone"
                                    placeholder="+123456789"
                                    required
                                />
                                <FormInput
                                    label="WhatsApp"
                                    name="client_whatsapp"
                                    placeholder="+123456789"
                                />
                                <FormInput
                                    label="Telegram"
                                    name="client_telegram"
                                    placeholder="@username"
                                />
                                <FormInput
                                    label="Email"
                                    name="client_email"
                                    type="email"
                                    placeholder="client@example.com"
                                />
                            </div>
                        </FormSection>

                        {/* Payments */}
                        <FormSection
                            title="Payments"
                            icon={<BanknotesIcon className="w-6 h-6" />}
                        >
                            <div className="space-y-4">
                                <div className="space-y-3">
                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Full Insurance</span>
                                            <Toggle enabled={fullInsurance} onChange={setFullInsurance} />
                                        </div>
                                        {fullInsurance && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                                <FormInput label="Amount" name="extra_full_insurance_amount" type="number" placeholder="0.00" />
                                                <FormSelect
                                                    label="Currency"
                                                    name="extra_full_insurance_currency"
                                                    options={currencies.map((c: { id: number; code: string; symbol: string }) => ({ id: c.id, name: `${c.code} (${c.symbol})` }))}
                                                    placeholder="Select Currency"
                                                />
                                                <FormSelect
                                                    label="Method"
                                                    name="extra_full_insurance_method"
                                                    options={[
                                                        { id: "cash", name: "Cash" },
                                                        { id: "bank_transfer", name: "Bank Transfer" },
                                                        { id: "card", name: "Card" },
                                                    ]}
                                                    placeholder="Select Method"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Island Trip</span>
                                            <Toggle enabled={islandTrip} onChange={setIslandTrip} />
                                        </div>
                                        {islandTrip && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                                <FormInput label="Amount" name="extra_island_trip_amount" type="number" placeholder="0.00" />
                                                <FormSelect
                                                    label="Currency"
                                                    name="extra_island_trip_currency"
                                                    options={currencies.map((c: { id: number; code: string; symbol: string }) => ({ id: c.id, name: `${c.code} (${c.symbol})` }))}
                                                    placeholder="Select Currency"
                                                />
                                                <FormSelect
                                                    label="Method"
                                                    name="extra_island_trip_method"
                                                    options={[
                                                        { id: "cash", name: "Cash" },
                                                        { id: "bank_transfer", name: "Bank Transfer" },
                                                        { id: "card", name: "Card" },
                                                    ]}
                                                    placeholder="Select Method"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Krabi Trip</span>
                                            <Toggle enabled={krabiTrip} onChange={setKrabiTrip} />
                                        </div>
                                        {krabiTrip && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                                <FormInput label="Amount" name="extra_krabi_trip_amount" type="number" placeholder="0.00" />
                                                <FormSelect
                                                    label="Currency"
                                                    name="extra_krabi_trip_currency"
                                                    options={currencies.map((c: { id: number; code: string; symbol: string }) => ({ id: c.id, name: `${c.code} (${c.symbol})` }))}
                                                    placeholder="Select Currency"
                                                />
                                                <FormSelect
                                                    label="Method"
                                                    name="extra_krabi_trip_method"
                                                    options={[
                                                        { id: "cash", name: "Cash" },
                                                        { id: "bank_transfer", name: "Bank Transfer" },
                                                        { id: "card", name: "Card" },
                                                    ]}
                                                    placeholder="Select Method"
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-medium text-gray-700">Baby Seat</span>
                                            <Toggle enabled={babySeat} onChange={setBabySeat} />
                                        </div>
                                        {babySeat && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                                                <FormInput label="Amount" name="extra_baby_seat_amount" type="number" placeholder="0.00" />
                                                <FormSelect
                                                    label="Currency"
                                                    name="extra_baby_seat_currency"
                                                    options={currencies.map((c: { id: number; code: string; symbol: string }) => ({ id: c.id, name: `${c.code} (${c.symbol})` }))}
                                                    placeholder="Select Currency"
                                                />
                                                <FormSelect
                                                    label="Method"
                                                    name="extra_baby_seat_method"
                                                    options={[
                                                        { id: "cash", name: "Cash" },
                                                        { id: "bank_transfer", name: "Bank Transfer" },
                                                        { id: "card", name: "Card" },
                                                    ]}
                                                    placeholder="Select Method"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </FormSection>
                    </Form>
                </div>

                {/* Right Sidebar */}
                <div className="lg:col-span-1 space-y-4">
                    {/* Financial Summary */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Financial Summary</h3>
                        <div className="space-y-3">
                            <FormInput
                                label="Delivery Price"
                                name="delivery_cost"
                                type="number"
                                placeholder="0.00"
                            />
                            <FormInput
                                label="Return Price"
                                name="return_cost"
                                type="number"
                                placeholder="0.00"
                            />
                            <FormInput
                                label="Deposit Payment"
                                name="deposit_amount"
                                type="number"
                                placeholder="0.00"
                            />
                            <FormSelect
                                label="Deposit Method"
                                name="deposit_payment_method"
                                options={[
                                    { id: "cash", name: "Cash" },
                                    { id: "bank_transfer", name: "Bank Transfer" },
                                    { id: "card", name: "Card" },
                                ]}
                                placeholder="Select method"
                            />
                            <FormInput
                                label="Total Rental Cost"
                                name="total_amount"
                                type="number"
                                placeholder="0.00"
                                required
                            />
                        </div>
                    </div>

                    {/* Car Photos */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-4">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                            Car Photos (max 12)
                        </label>
                        <CarPhotosUpload
                            onPhotosChange={setCarPhotos}
                            maxPhotos={12}
                        />
                    </div>

                    {/* Document Photos */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Document Photos</h3>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <DocumentPhotosUpload
                                currentPhotos={passportPhotos.map((p) => p.base64)}
                                onPhotosChange={setPassportPhotos}
                                maxPhotos={3}
                                label="Passport"
                            />
                            <DocumentPhotosUpload
                                currentPhotos={driverLicensePhotos.map((p) => p.base64)}
                                onPhotosChange={setDriverLicensePhotos}
                                maxPhotos={3}
                                label="Driver License"
                            />
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="bg-white rounded-3xl border border-gray-200 p-4">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Notes & Terms</h3>
                        <Textarea
                            label="Contract Notes"
                            name="notes"
                            rows={4}
                            placeholder="Add any extra information (flight info, car condition, etc.)"
                        />
                    </div>

                </div>
            </div>
        </div>
    );
}
