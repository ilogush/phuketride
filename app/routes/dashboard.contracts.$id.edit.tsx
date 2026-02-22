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
import { createContractEvents } from "~/lib/calendar-events.server";
import {
    TruckIcon,
    CalendarIcon,
    UserIcon,
    CubeIcon,
    BanknotesIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const contractId = parseInt(params.id!);

    // Get contract with car details
    const contractRaw = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                c.*,
                cc.id AS carId,
                cc.company_id AS companyId,
                cc.license_plate AS licensePlate,
                u.id AS clientId,
                u.name AS clientName,
                u.surname AS clientSurname,
                u.phone AS clientPhone,
                u.email AS clientEmail,
                u.whatsapp AS clientWhatsapp,
                u.telegram AS clientTelegram,
                u.passport_number AS clientPassport,
                u.citizenship AS clientCitizenship,
                u.gender AS clientGender,
                u.date_of_birth AS clientDateOfBirth,
                u.passport_photos AS clientPassportPhotos,
                u.driver_license_photos AS clientDriverLicensePhotos
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN users u ON u.id = c.client_id
            WHERE c.id = ?
            LIMIT 1
        `)
        .bind(contractId)
        .first<any>();
    const contract = contractRaw
        ? {
            ...contractRaw,
            companyCarId: contractRaw.company_car_id,
            startDate: contractRaw.start_date,
            endDate: contractRaw.end_date,
            pickupDistrictId: contractRaw.pickup_district_id,
            pickupHotel: contractRaw.pickup_hotel,
            pickupRoom: contractRaw.pickup_room,
            returnDistrictId: contractRaw.return_district_id,
            returnHotel: contractRaw.return_hotel,
            returnRoom: contractRaw.return_room,
            deliveryCost: contractRaw.delivery_cost,
            returnCost: contractRaw.return_cost,
            depositAmount: contractRaw.deposit_amount,
            depositPaymentMethod: contractRaw.deposit_payment_method,
            totalAmount: contractRaw.total_amount,
            fuelLevel: contractRaw.fuel_level,
            fullInsuranceEnabled: !!contractRaw.full_insurance_enabled,
            babySeatEnabled: !!contractRaw.baby_seat_enabled,
            islandTripEnabled: !!contractRaw.island_trip_enabled,
            krabiTripEnabled: !!contractRaw.krabi_trip_enabled,
            fullInsurancePrice: contractRaw.full_insurance_price,
            babySeatPrice: contractRaw.baby_seat_price,
            islandTripPrice: contractRaw.island_trip_price,
            krabiTripPrice: contractRaw.krabi_trip_price,
            startMileage: contractRaw.start_mileage,
            companyCar: { id: contractRaw.carId, companyId: contractRaw.companyId, licensePlate: contractRaw.licensePlate },
            client: {
                id: contractRaw.clientId,
                name: contractRaw.clientName,
                surname: contractRaw.clientSurname,
                phone: contractRaw.clientPhone,
                email: contractRaw.clientEmail,
                whatsapp: contractRaw.clientWhatsapp,
                telegram: contractRaw.clientTelegram,
                passportNumber: contractRaw.clientPassport,
                citizenship: contractRaw.clientCitizenship,
                gender: contractRaw.clientGender,
                dateOfBirth: contractRaw.clientDateOfBirth,
                passportPhotos: contractRaw.clientPassportPhotos,
                driverLicensePhotos: contractRaw.clientDriverLicensePhotos,
            },
        }
        : null;

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    // SECURITY: Verify contract belongs to user's company
    if (user.role !== "admin" && contract.companyCar.companyId !== user.companyId) {
        throw new Response("Access denied", { status: 403 });
    }

    // Get company cars
    const cars = await context.cloudflare.env.DB
        .prepare("SELECT id, license_plate AS licensePlate FROM company_cars WHERE company_id = ? AND status = 'available' AND archived_at IS NULL")
        .bind(user.companyId)
        .all()
        .then((r: any) => r.results || []);

    // Get districts
    const districtsList = await context.cloudflare.env.DB
        .prepare("SELECT id, name FROM districts WHERE is_active = 1")
        .all()
        .then((r: any) => r.results || []);

    return { contract, cars, districts: districtsList, client: contract.client };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const contractId = parseInt(params.id!);
    const existingContract = await context.cloudflare.env.DB
        .prepare(`
            SELECT *
            FROM contracts
            WHERE id = ?
            LIMIT 1
        `)
        .bind(contractId)
        .first<any>();

    if (!existingContract) {
        return redirect(`/contracts?error=${encodeURIComponent("Contract not found")}`);
    }

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

    // SECURITY: Verify contract belongs to user's company
    const contract = await context.cloudflare.env.DB
        .prepare(`
            SELECT c.id, cc.company_id AS companyId
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            WHERE c.id = ?
            LIMIT 1
        `)
        .bind(contractId)
        .first<any>();

    if (!contract) {
        return redirect(`/contracts?error=${encodeURIComponent("Contract not found")}`);
    }

    if (user.role !== "admin" && contract.companyCar.companyId !== user.companyId) {
        return redirect(`/contracts?error=${encodeURIComponent("Access denied")}`);
    }

    // Client update (keep existing values if empty)
    const passportPhotosValue = parseDocPhotos(formData.get("passportPhotos"));
    const driverLicensePhotosValue = parseDocPhotos(formData.get("driverLicensePhotos"));

    const clientUpdate: Record<string, unknown> = {
        name: String(formData.get("client_name") || "").trim() || null,
        surname: String(formData.get("client_surname") || "").trim() || null,
        phone: String(formData.get("client_phone") || "").trim() || null,
        whatsapp: String(formData.get("client_whatsapp") || "").trim() || null,
        telegram: String(formData.get("client_telegram") || "").trim() || null,
        passportNumber: String(formData.get("client_passport") || "").trim() || null,
        citizenship: String(formData.get("citizenship") || "").trim() || null,
        gender: (String(formData.get("client_gender") || "").trim() as any) || null,
        dateOfBirth: formData.get("date_of_birth") ? new Date(String(formData.get("date_of_birth"))) : null,
        updatedAt: new Date(),
    };

    const email = String(formData.get("client_email") || "").trim();
    if (email) {
        clientUpdate.email = email;
    }
    if (passportPhotosValue.length > 0) {
        clientUpdate.passportPhotos = JSON.stringify(passportPhotosValue);
    }
    if (driverLicensePhotosValue.length > 0) {
        clientUpdate.driverLicensePhotos = JSON.stringify(driverLicensePhotosValue);
    }

    await context.cloudflare.env.DB
        .prepare(`
            UPDATE users
            SET name = ?, surname = ?, phone = ?, whatsapp = ?, telegram = ?, passport_number = ?, citizenship = ?,
                gender = ?, date_of_birth = ?, email = COALESCE(?, email), passport_photos = COALESCE(?, passport_photos),
                driver_license_photos = COALESCE(?, driver_license_photos), updated_at = ?
            WHERE id = ?
        `)
        .bind(
            clientUpdate.name,
            clientUpdate.surname,
            clientUpdate.phone,
            clientUpdate.whatsapp,
            clientUpdate.telegram,
            clientUpdate.passportNumber,
            clientUpdate.citizenship,
            clientUpdate.gender,
            (clientUpdate.dateOfBirth as Date | null)?.toISOString?.() ?? null,
            (clientUpdate.email as string | undefined) ?? null,
            (clientUpdate.passportPhotos as string | undefined) ?? null,
            (clientUpdate.driverLicensePhotos as string | undefined) ?? null,
            new Date().toISOString(),
            existingContract.client_id
        )
        .run();

    const getValidDate = (value: FormDataEntryValue | null, fallback: Date) => {
        if (typeof value !== "string" || !value) return fallback;
        const d = new Date(value);
        return isNaN(d.getTime()) ? fallback : d;
    };

    const newCompanyCarId = Number(formData.get("company_car_id")) || existingContract.companyCarId;
    const startDate = getValidDate(formData.get("start_date"), new Date(existingContract.startDate));
    const endDate = getValidDate(formData.get("end_date"), new Date(existingContract.endDate));
    const photosValue = parsePhotoList(formData.get("photos"));

    const pickupDistrictIdRaw = formData.get("pickup_district_id");
    const returnDistrictIdRaw = formData.get("return_district_id");

    const pickupDistrictId = pickupDistrictIdRaw ? Number(pickupDistrictIdRaw) : null;
    const returnDistrictId = returnDistrictIdRaw ? Number(returnDistrictIdRaw) : null;

    const updatePayload: Record<string, unknown> = {
        companyCarId: newCompanyCarId,
        startDate,
        endDate,
        pickupDistrictId,
        pickupHotel: (formData.get("pickup_hotel") as string) || null,
        pickupRoom: (formData.get("pickup_room") as string) || null,
        deliveryCost: Number(formData.get("delivery_cost")) || 0,
        returnDistrictId,
        returnHotel: (formData.get("return_hotel") as string) || null,
        returnRoom: (formData.get("return_room") as string) || null,
        returnCost: Number(formData.get("return_cost")) || 0,
        depositAmount: Number(formData.get("deposit_amount")) || 0,
        depositPaymentMethod: (formData.get("deposit_payment_method") as any) || null,
        totalAmount: Number(formData.get("total_amount")) || existingContract.totalAmount,
        fuelLevel: String(formData.get("fuel_level") || existingContract.fuelLevel || "Full"),
        cleanliness: String(formData.get("cleanliness") || existingContract.cleanliness || "Clean"),
        startMileage: Number(formData.get("start_mileage")) || existingContract.startMileage || 0,
        fullInsuranceEnabled: formData.get("fullInsurance") === "true",
        babySeatEnabled: formData.get("babySeat") === "true",
        islandTripEnabled: formData.get("islandTrip") === "true",
        krabiTripEnabled: formData.get("krabiTrip") === "true",
        // prices are not editable in this form yet, keep current values
        fullInsurancePrice: existingContract.fullInsurancePrice ?? 0,
        babySeatPrice: existingContract.babySeatPrice ?? 0,
        islandTripPrice: existingContract.islandTripPrice ?? 0,
        krabiTripPrice: existingContract.krabiTripPrice ?? 0,
        notes: (formData.get("notes") as string) || null,
        updatedAt: new Date(),
    };

    if (photosValue.length > 0) {
        updatePayload.photos = JSON.stringify(photosValue);
    }

    await context.cloudflare.env.DB
        .prepare(`
            UPDATE contracts
            SET company_car_id = ?, start_date = ?, end_date = ?, pickup_district_id = ?, pickup_hotel = ?, pickup_room = ?,
                delivery_cost = ?, return_district_id = ?, return_hotel = ?, return_room = ?, return_cost = ?, deposit_amount = ?,
                deposit_payment_method = ?, total_amount = ?, fuel_level = ?, cleanliness = ?, start_mileage = ?,
                full_insurance_enabled = ?, baby_seat_enabled = ?, island_trip_enabled = ?, krabi_trip_enabled = ?,
                full_insurance_price = ?, baby_seat_price = ?, island_trip_price = ?, krabi_trip_price = ?, notes = ?,
                photos = COALESCE(?, photos), updated_at = ?
            WHERE id = ?
        `)
        .bind(
            updatePayload.companyCarId,
            (updatePayload.startDate as Date).toISOString(),
            (updatePayload.endDate as Date).toISOString(),
            updatePayload.pickupDistrictId,
            updatePayload.pickupHotel,
            updatePayload.pickupRoom,
            updatePayload.deliveryCost,
            updatePayload.returnDistrictId,
            updatePayload.returnHotel,
            updatePayload.returnRoom,
            updatePayload.returnCost,
            updatePayload.depositAmount,
            updatePayload.depositPaymentMethod,
            updatePayload.totalAmount,
            updatePayload.fuelLevel,
            updatePayload.cleanliness,
            updatePayload.startMileage,
            updatePayload.fullInsuranceEnabled ? 1 : 0,
            updatePayload.babySeatEnabled ? 1 : 0,
            updatePayload.islandTripEnabled ? 1 : 0,
            updatePayload.krabiTripEnabled ? 1 : 0,
            updatePayload.fullInsurancePrice,
            updatePayload.babySeatPrice,
            updatePayload.islandTripPrice,
            updatePayload.krabiTripPrice,
            updatePayload.notes,
            (updatePayload.photos as string | undefined) ?? null,
            new Date().toISOString(),
            contractId
        )
        .run();

    if (newCompanyCarId !== existingContract.companyCarId) {
        const { updateCarStatus } = await import("~/lib/contract-helpers.server");
        await updateCarStatus(context.cloudflare.env.DB, existingContract.company_car_id, 'available', 'Contract car changed');
        await updateCarStatus(context.cloudflare.env.DB, newCompanyCarId, 'rented', 'Contract car changed');
    }

    // Refresh calendar events (delete old and recreate)
    const carRow = await context.cloudflare.env.DB
        .prepare("SELECT company_id AS companyId FROM company_cars WHERE id = ? LIMIT 1")
        .bind(newCompanyCarId)
        .first<any>();

    if (carRow?.companyId) {
        await context.cloudflare.env.DB
            .prepare("DELETE FROM calendar_events WHERE related_id = ? AND event_type IN ('pickup', 'contract')")
            .bind(contractId)
            .run();

        await createContractEvents({
            db: context.cloudflare.env.DB,
            companyId: carRow.companyId,
            contractId,
            startDate,
            endDate,
            createdBy: user.id,
        });
    }

    return redirect(`/contracts/${contractId}?success=${encodeURIComponent("Contract updated successfully")}`);
}

export default function EditContract() {
    const { contract, cars, districts, client } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    // Safely parse dates
    const getValidDate = (dateValue: any) => {
        if (!dateValue) return new Date();
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    const [startDate, setStartDate] = useState(getValidDate(contract.startDate));
    const [endDate, setEndDate] = useState(getValidDate(contract.endDate));
    const [fullInsurance, setFullInsurance] = useState(contract.fullInsuranceEnabled || false);
    const [islandTrip, setIslandTrip] = useState(contract.islandTripEnabled || false);
    const [krabiTrip, setKrabiTrip] = useState(contract.krabiTripEnabled || false);
    const [babySeat, setBabySeat] = useState(contract.babySeatEnabled || false);
    const [carPhotos, setCarPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [passportPhotos, setPassportPhotos] = useState<Array<{ base64: string; fileName: string }>>(() => {
        try {
            return client?.passportPhotos ? JSON.parse(client.passportPhotos) : [];
        } catch {
            return [];
        }
    });
    const [driverLicensePhotos, setDriverLicensePhotos] = useState<Array<{ base64: string; fileName: string }>>(() => {
        try {
            return client?.driverLicensePhotos ? JSON.parse(client.driverLicensePhotos) : [];
        } catch {
            return [];
        }
    });
    const [notes, setNotes] = useState(contract.notes || "");

    const existingContractPhotos: string[] = (() => {
        try {
            return contract.photos ? JSON.parse(contract.photos) : [];
        } catch {
            return [];
        }
    })();

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
                title={`Edit Contract #${contract.id}`}
                leftActions={<BackButton />}
            />

            <Form method="post" className="space-y-4">
                <input type="hidden" name="passportPhotos" value={JSON.stringify(passportPhotos)} />
                <input type="hidden" name="driverLicensePhotos" value={JSON.stringify(driverLicensePhotos)} />
                <input
                    type="hidden"
                    name="photos"
                    value={JSON.stringify((carPhotos.length > 0 ? carPhotos.map((p) => p.base64) : existingContractPhotos))}
                />
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
                            defaultValue={contract.companyCarId}
                            placeholder="Select car"
                            required
                        />
                        <FormSelect
                            label="Fuel Level"
                            name="fuel_level"
                            options={fuelLevels}
                            defaultValue={contract.fuelLevel || "Full"}
                            required
                        />
                        <FormSelect
                            label="Cleanliness"
                            name="cleanliness"
                            options={cleanlinessOptions}
                            defaultValue={contract.cleanliness || "Clean"}
                            required
                        />
                        <FormInput
                            label="Start Mileage"
                            name="start_mileage"
                            type="number"
                            defaultValue={contract.startMileage}
                            placeholder="0"
                            required
                        />
                    </div>
                </FormSection>

                {/* Car Photos */}
                <div className="bg-white rounded-3xl border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                        Car Photos (max 12)
                    </label>
                    <CarPhotosUpload
                        currentPhotos={existingContractPhotos}
                        onPhotosChange={setCarPhotos}
                        maxPhotos={12}
                    />
                </div>

                {/* Rental Details */}
                <FormSection
                    title="Rental Details"
                    icon={<CalendarIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            label="Start Date & Time"
                            type="datetime-local"
                            name="start_date"
                            required
                            defaultValue={startDate.toISOString().slice(0, 16)}
                            onChange={(e) => setStartDate(new Date(e.target.value))}
                        />
                        <FormSelect
                            label="Pickup District"
                            name="pickup_district_id"
                            options={districts}
                            defaultValue={contract.pickupDistrictId}
                            placeholder="Select district"
                            required
                        />
                        <FormInput
                            label="Hotel"
                            name="pickup_hotel"
                            defaultValue={contract.pickupHotel}
                            placeholder="Type or select hotel..."
                        />
                        <FormInput
                            label="Room Number"
                            name="pickup_room"
                            defaultValue={contract.pickupRoom}
                            placeholder="Room..."
                        />
                        <Input
                            label="End Date & Time"
                            type="datetime-local"
                            name="end_date"
                            required
                            defaultValue={endDate.toISOString().slice(0, 16)}
                            onChange={(e) => setEndDate(new Date(e.target.value))}
                        />
                        <FormSelect
                            label="Return District"
                            name="return_district_id"
                            options={districts}
                            defaultValue={contract.returnDistrictId}
                            placeholder="Select district"
                            required
                        />
                        <FormInput
                            label="Return Hotel"
                            name="return_hotel"
                            defaultValue={contract.returnHotel}
                            placeholder="Type or select return hotel..."
                        />
                        <FormInput
                            label="Return Room Number"
                            name="return_room"
                            defaultValue={contract.returnRoom}
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
                            defaultValue={client?.passportNumber}
                            placeholder="Passport ID"
                            required
                        />
                        <FormInput
                            label="First Name"
                            name="client_name"
                            defaultValue={client?.name}
                            placeholder="John"
                            required
                        />
                        <FormInput
                            label="Last Name"
                            name="client_surname"
                            defaultValue={client?.surname}
                            placeholder="Doe"
                            required
                        />
                        <FormInput
                            label="Citizenship"
                            name="citizenship"
                            defaultValue={client?.citizenship}
                            placeholder="Type to search citizenship..."
                        />
                        <FormInput
                            label="City"
                            name="city"
                            defaultValue={client?.city}
                            placeholder="Type to search city..."
                        />
                        <FormSelect
                            label="Gender"
                            name="client_gender"
                            options={genderOptions}
                            defaultValue={client?.gender}
                            placeholder="Select gender"
                        />
                        <FormInput
                            label="Birth Date"
                            name="date_of_birth"
                            type="date"
                            defaultValue={client?.dateOfBirth ? format(new Date(client.dateOfBirth), "yyyy-MM-dd") : ""}
                            placeholder="DD-MM-YYYY"
                        />
                        <div />
                        <FormInput
                            label="Phone"
                            name="client_phone"
                            defaultValue={client?.phone}
                            placeholder="+123456789"
                            required
                        />
                        <FormInput
                            label="WhatsApp"
                            name="client_whatsapp"
                            defaultValue={client?.whatsapp}
                            placeholder="+123456789"
                        />
                        <FormInput
                            label="Telegram"
                            name="client_telegram"
                            defaultValue={client?.telegram}
                            placeholder="@username"
                        />
                        <FormInput
                            label="Email"
                            name="client_email"
                            type="email"
                            defaultValue={client?.email}
                            placeholder="client@example.com"
                        />
                    </div>
                </FormSection>

                {/* Document Photos */}
                <div className="bg-white rounded-3xl border border-gray-200 p-4">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
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

                {/* Extras */}
                <FormSection
                    title="Extras"
                    icon={<CubeIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Full Insurance</span>
                            <Toggle enabled={fullInsurance} onChange={setFullInsurance} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Island Trip</span>
                            <Toggle enabled={islandTrip} onChange={setIslandTrip} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Krabi Trip</span>
                            <Toggle enabled={krabiTrip} onChange={setKrabiTrip} />
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Baby Seat</span>
                            <Toggle enabled={babySeat} onChange={setBabySeat} />
                        </div>
                    </div>
                </FormSection>

                {/* Financial Summary */}
                <FormSection
                    title="Financial Summary"
                    icon={<BanknotesIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput
                            label="Delivery Price"
                            name="delivery_cost"
                            type="number"
                            defaultValue={contract.deliveryCost}
                            placeholder="0.00"
                        />
                        <FormInput
                            label="Return Price"
                            name="return_cost"
                            type="number"
                            defaultValue={contract.returnCost}
                            placeholder="0.00"
                        />
                        <FormInput
                            label="Deposit Payment"
                            name="deposit_amount"
                            type="number"
                            defaultValue={contract.depositAmount}
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
                            defaultValue={contract.depositPaymentMethod || ""}
                            placeholder="Select method"
                        />
                        <FormInput
                            label="Total Rental Cost"
                            name="total_amount"
                            type="number"
                            defaultValue={contract.totalAmount}
                            placeholder="0.00"
                            required
                        />
                    </div>
                </FormSection>

                {/* Notes */}
                <FormSection
                    title="Notes & Terms"
                    icon={<DocumentTextIcon className="w-6 h-6" />}
                >
                    <Textarea
                        label="Contract Notes"
                        name="notes"
                        rows={4}
                        value={notes}
                        onChange={setNotes}
                        placeholder="Add any extra information (flight info, car condition, etc.)"
                    />
                </FormSection>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate(`/contracts/${contract.id}`)}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Save
                    </Button>
                </div>
            </Form>
        </div>
    );
}
