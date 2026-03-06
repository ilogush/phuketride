import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { Form, useLoaderData } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import FormSection from "~/components/dashboard/FormSection";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import ExtrasToggleGrid from "~/components/dashboard/contracts/ExtrasToggleGrid";
import ContractFinancialFields from "~/components/dashboard/contracts/ContractFinancialFields";
import ContractDocumentPhotosRow from "~/components/dashboard/contracts/ContractDocumentPhotosRow";
import ContractNotesField from "~/components/dashboard/contracts/ContractNotesField";
import ContractRentalDetailsFields from "~/components/dashboard/contracts/ContractRentalDetailsFields";
import ContractClientDetailsFields from "~/components/dashboard/contracts/ContractClientDetailsFields";
import ContractCarDetailsFields from "~/components/dashboard/contracts/ContractCarDetailsFields";
import ContractCarPhotosCard from "~/components/dashboard/contracts/ContractCarPhotosCard";
import { useDateMasking } from "~/lib/useDateMasking";
import { formatDateForDisplay } from "~/lib/formatters";
import { EXTRA_TYPES, mapExtrasByType } from "~/lib/contract-extras.server";
import { handleEditContractAction } from "~/lib/contracts-edit-action.server";
import {
    TruckIcon,
    CalendarIcon,
    UserIcon,
    CubeIcon,
    BanknotesIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useUrlToast } from "~/lib/useUrlToast";
type ContractLoaderRow = {
    id: number;
    company_car_id: number;
    start_date: string;
    end_date: string;
    pickup_district_id: number | null;
    pickup_hotel: string | null;
    pickup_room: string | null;
    return_district_id: number | null;
    return_hotel: string | null;
    return_room: string | null;
    delivery_cost: number | null;
    return_cost: number | null;
    deposit_amount: number | null;
    deposit_payment_method: string | null;
    total_amount: number | null;
    fuel_level: string | null;
    cleanliness: string | null;
    start_mileage: number | null;
    carId: number;
    companyId: number;
    licensePlate: string;
    clientId: string;
    clientName: string | null;
    clientSurname: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    clientWhatsapp: string | null;
    clientTelegram: string | null;
    clientPassport: string | null;
    clientPassportPhotos: string | null;
    clientDriverLicensePhotos: string | null;
    notes: string | null;
    photos: string | null;
};
type ContractExtraRow = {
    id: number;
    extraType: (typeof EXTRA_TYPES)[number];
    extraPrice: number | null;
    amount: number | null;
    paymentTypeId: number | null;
    currency: string | null;
    currencyId: number | null;
    paymentMethod: string | null;
    status: string | null;
    notes: string | null;
};

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
                u.passport_photos AS clientPassportPhotos,
                u.driver_license_photos AS clientDriverLicensePhotos
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN users u ON u.id = c.client_id
            WHERE c.id = ?
            LIMIT 1
        `)
        .bind(contractId)
        .first() as ContractLoaderRow | null;
    const extrasResult = await context.cloudflare.env.DB
        .prepare(`
            SELECT id, extra_type AS extraType, extra_price AS extraPrice, amount, payment_type_id AS paymentTypeId,
                   currency, currency_id AS currencyId, payment_method AS paymentMethod, status, notes
            FROM payments
            WHERE contract_id = ? AND extra_type IS NOT NULL
        `)
        .bind(contractId)
        .all() as { results?: ContractExtraRow[] };
    const extrasRows = (extrasResult?.results || []) as ContractExtraRow[];
    const extrasMap = mapExtrasByType(extrasRows);
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
            cleanliness: contractRaw.cleanliness,
            fullInsuranceEnabled: !!extrasMap.full_insurance,
            babySeatEnabled: !!extrasMap.baby_seat,
            islandTripEnabled: !!extrasMap.island_trip,
            krabiTripEnabled: !!extrasMap.krabi_trip,
            fullInsurancePrice: extrasMap.full_insurance?.extraPrice ?? extrasMap.full_insurance?.amount ?? 0,
            babySeatPrice: extrasMap.baby_seat?.extraPrice ?? extrasMap.baby_seat?.amount ?? 0,
            islandTripPrice: extrasMap.island_trip?.extraPrice ?? extrasMap.island_trip?.amount ?? 0,
            krabiTripPrice: extrasMap.krabi_trip?.extraPrice ?? extrasMap.krabi_trip?.amount ?? 0,
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
        .then((r: { results?: Array<{ id: number; licensePlate: string }> }) => r.results || []);

    // Get districts
    const districtsList = await context.cloudflare.env.DB
        .prepare("SELECT id, name FROM districts WHERE is_active = 1")
        .all()
        .then((r: { results?: Array<{ id: number; name: string }> }) => r.results || []);

    return { contract, cars, districts: districtsList, client: contract.client };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
    return handleEditContractAction({ request, context, user, params, formData });
}

export default function EditContract() {
    useUrlToast();
    const { contract, cars, districts, client } = useLoaderData<typeof loader>();
    const { maskDateTimeInput } = useDateMasking();

    // Safely parse dates
    const getValidDate = (dateValue: unknown) => {
        if (!dateValue) return new Date();
        if (typeof dateValue !== "string" && typeof dateValue !== "number" && !(dateValue instanceof Date)) {
            return new Date();
        }
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? new Date() : date;
    };

    const startDate = getValidDate(contract.startDate);
    const endDate = getValidDate(contract.endDate);
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

    const extraToggleItems = [
        { key: "full_insurance", label: "Full Insurance", enabled: fullInsurance, onToggle: setFullInsurance },
        { key: "island_trip", label: "Island Trip", enabled: islandTrip, onToggle: setIslandTrip },
        { key: "krabi_trip", label: "Krabi Trip", enabled: krabiTrip, onToggle: setKrabiTrip },
        { key: "baby_seat", label: "Baby Seat", enabled: babySeat, onToggle: setBabySeat },
    ];

    return (
        <div className="space-y-4">
            <PageHeader
                title={`Edit Contract #${contract.id}`}
                leftActions={<BackButton to="/contracts" />}
                rightActions={
                    <Button type="submit" variant="primary" form="edit-contract-form">
                        Save
                    </Button>
                }
            />

            <Form id="edit-contract-form" method="post" className="space-y-4">
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
                    <ContractCarDetailsFields
                        cars={cars}
                        defaults={{
                            companyCarId: contract.companyCarId,
                            fuelLevel: contract.fuelLevel,
                            cleanliness: contract.cleanliness,
                            startMileage: contract.startMileage,
                        }}
                    />
                </FormSection>

                {/* Car Photos */}
                <ContractCarPhotosCard
                    currentPhotos={existingContractPhotos}
                    onPhotosChange={setCarPhotos}
                />

                {/* Rental Details */}
                <FormSection
                    title="Rental Details"
                    icon={<CalendarIcon className="w-6 h-6" />}
                >
                    <ContractRentalDetailsFields
                        districts={districts}
                        onDateChange={maskDateTimeInput}
                        defaults={{
                            startDateTime: formatDateForDisplay(startDate) + " " + format(startDate, "HH:mm"),
                            pickupDistrictId: contract.pickupDistrictId,
                            pickupHotel: contract.pickupHotel,
                            pickupRoom: contract.pickupRoom,
                            endDateTime: formatDateForDisplay(endDate) + " " + format(endDate, "HH:mm"),
                            returnDistrictId: contract.returnDistrictId,
                            returnHotel: contract.returnHotel,
                            returnRoom: contract.returnRoom,
                        }}
                    />
                </FormSection>

                {/* User Details */}
                <FormSection
                    title="User Details"
                    icon={<UserIcon className="w-6 h-6" />}
                >
                    <ContractClientDetailsFields
                        defaults={{
                            passportNumber: client?.passportNumber,
                            name: client?.name,
                            surname: client?.surname,
                            phone: client?.phone,
                            whatsapp: client?.whatsapp,
                            telegram: client?.telegram,
                            email: client?.email,
                        }}
                    />
                </FormSection>

                {/* Document Photos */}
                <div className="bg-white rounded-3xl border border-gray-200 p-4">
                    <ContractDocumentPhotosRow
                        passportPhotos={passportPhotos}
                        onPassportPhotosChange={setPassportPhotos}
                        driverLicensePhotos={driverLicensePhotos}
                        onDriverLicensePhotosChange={setDriverLicensePhotos}
                    />
                </div>

                {/* Extras */}
                <FormSection
                    title="Extras"
                    icon={<CubeIcon className="w-6 h-6" />}
                >
                    <ExtrasToggleGrid items={extraToggleItems} />
                </FormSection>

                {/* Financial Summary */}
                <FormSection
                    title="Financial Summary"
                    icon={<BanknotesIcon className="w-6 h-6" />}
                >
                    <ContractFinancialFields
                        defaults={{
                            deliveryCost: contract.deliveryCost,
                            returnCost: contract.returnCost,
                            depositAmount: contract.depositAmount,
                            depositPaymentMethod: contract.depositPaymentMethod,
                            totalAmount: contract.totalAmount,
                        }}
                    />
                </FormSection>

                {/* Notes */}
                <FormSection
                    title="Notes & Terms"
                    icon={<DocumentTextIcon className="w-6 h-6" />}
                >
                    <ContractNotesField value={notes} onChange={setNotes} />
                </FormSection>

            </Form>
        </div>
    );
}
