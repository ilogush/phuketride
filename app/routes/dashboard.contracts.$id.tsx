import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, useNavigate } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import FormSection from "~/components/dashboard/FormSection";
import ReadOnlyField from "~/components/dashboard/ReadOnlyField";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Button from "~/components/dashboard/Button";
import StatusBadge from "~/components/dashboard/StatusBadge";
import Card from "~/components/dashboard/Card";
import {
    TruckIcon,
    CalendarIcon,
    UserIcon,
    CubeIcon,
    BanknotesIcon,
    DocumentTextIcon,
    PencilIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const d1 = context.cloudflare.env.DB;
    const contractId = parseInt(params.id!);

    // Get contract
    const contract = await d1
        .prepare("SELECT * FROM contracts WHERE id = ? LIMIT 1")
        .bind(contractId)
        .first<Record<string, unknown>>();

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    // Get car details
    const car = await d1
        .prepare("SELECT * FROM company_cars WHERE id = ? LIMIT 1")
        .bind(contract.company_car_id)
        .first<Record<string, unknown>>();

    // Get client details
    const client = await d1
        .prepare("SELECT * FROM users WHERE id = ? LIMIT 1")
        .bind(contract.client_id)
        .first<Record<string, unknown>>();

    // Get districts
    const districtsResult = await d1
        .prepare("SELECT * FROM districts")
        .all();
    const allDistricts = (districtsResult.results ?? []) as Array<Record<string, unknown>>;
    const pickupDistrict = allDistricts.find(d => d.id === contract.pickup_district_id);
    const returnDistrict = allDistricts.find(d => d.id === contract.return_district_id);

    return {
        contract: {
            ...contract,
            companyCarId: contract.company_car_id,
            clientId: contract.client_id,
            pickupDistrictId: contract.pickup_district_id,
            returnDistrictId: contract.return_district_id,
            pickupHotel: contract.pickup_hotel,
            pickupRoom: contract.pickup_room,
            returnHotel: contract.return_hotel,
            returnRoom: contract.return_room,
            startMileage: contract.start_mileage,
            endMileage: contract.end_mileage,
            fuelLevel: contract.fuel_level,
            deliveryCost: contract.delivery_cost,
            returnCost: contract.return_cost,
            totalAmount: contract.total_amount,
            depositAmount: contract.deposit_amount,
            photos: contract.photos,
            startDate: contract.start_date,
            endDate: contract.end_date,
        },
        car: car
            ? {
                ...car,
                licensePlate: car.license_plate,
            }
            : null,
        client: client
            ? {
                ...client,
                passportNumber: client.passport_number,
                dateOfBirth: client.date_of_birth,
                passportPhotos: client.passport_photos,
                driverLicensePhotos: client.driver_license_photos,
            }
            : null,
        pickupDistrict,
        returnDistrict,
    };
}

export default function ContractView() {
    const { contract, car, client, pickupDistrict, returnDistrict } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

    const fuelLevelDisplay = contract.fuelLevel || "Full";
    const cleanlinessDisplay = contract.cleanliness || "Clean";

    const formatDate = (date: Date | null) => {
        if (!date) return "-";
        return format(new Date(date), "dd.MM.yyyy HH:mm");
    };

    const statusVariant = {
        active: "success" as const,
        closed: "neutral" as const,
    }[contract.status || "active"];

    return (
        <div className="space-y-4">
            <PageHeader
                title={`Contract #${contract.id}`}
                leftActions={<BackButton />}
                rightActions={
                    <Button
                        variant="primary"
                        icon={<PencilIcon className="w-5 h-5" />}
                        onClick={() => navigate(`/contracts/${contract.id}/edit`)}
                    >
                        Edit
                    </Button>
                }
            />

            <div className="space-y-4">
                {/* Car Details */}
                <FormSection
                    title="Car Details"
                    icon={<TruckIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReadOnlyField
                            label="Car"
                            value={car?.licensePlate || "-"}
                        />
                        <ReadOnlyField
                            label="Fuel Level"
                            value={fuelLevelDisplay}
                        />
                        <ReadOnlyField
                            label="Cleanliness"
                            value={cleanlinessDisplay}
                        />
                        <ReadOnlyField
                            label="Start Mileage"
                            value={contract.startMileage ? `${contract.startMileage} km` : "-"}
                        />
                    </div>
                </FormSection>

                {/* Car Photos */}
                {contract.photos && (() => {
                    try {
                        const photos = JSON.parse(contract.photos);
                        return photos.length > 0 ? (
                            <Card>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Car Photos
                                </label>
                                <div className="flex flex-wrap gap-4">
                                    {photos.map((photo: string, index: number) => (
                                        <div
                                            key={index}
                                            className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50"
                                        >
                                            <img
                                                src={photo}
                                                alt={`Car photo ${index + 1}`}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        ) : null;
                    } catch {
                        return null;
                    }
                })()}

                {/* Rental Details */}
                <FormSection
                    title="Rental Details"
                    icon={<CalendarIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReadOnlyField
                            label="Start Date & Time"
                            value={formatDate(contract.startDate)}
                        />
                        <ReadOnlyField
                            label="Pickup District"
                            value={pickupDistrict?.name || "-"}
                        />
                        <ReadOnlyField
                            label="Hotel"
                            value={contract.pickupHotel || "-"}
                        />
                        <ReadOnlyField
                            label="Room Number"
                            value={contract.pickupRoom || "-"}
                        />
                        <ReadOnlyField
                            label="End Date & Time"
                            value={formatDate(contract.endDate)}
                        />
                        <ReadOnlyField
                            label="Return District"
                            value={returnDistrict?.name || "-"}
                        />
                        <ReadOnlyField
                            label="Return Hotel"
                            value={contract.returnHotel || "-"}
                        />
                        <ReadOnlyField
                            label="Return Room Number"
                            value={contract.returnRoom || "-"}
                        />
                    </div>
                </FormSection>

                {/* User Details */}
                <FormSection
                    title="User Details"
                    icon={<UserIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReadOnlyField
                            label="First Name"
                            value={client?.name || "-"}
                        />
                        <ReadOnlyField
                            label="Last Name"
                            value={client?.surname || "-"}
                        />
                        <ReadOnlyField
                            label="Passport Number"
                            value={client?.passportNumber || "-"}
                        />
                        <ReadOnlyField
                            label="Citizenship"
                            value={client?.citizenship || "-"}
                        />
                        <ReadOnlyField
                            label="City"
                            value={client?.city || "-"}
                        />
                        <ReadOnlyField
                            label="Gender"
                            value={client?.gender || "-"}
                        />
                        <ReadOnlyField
                            label="Birth Date"
                            value={client?.dateOfBirth ? format(new Date(client.dateOfBirth), "dd-MM-yyyy") : "-"}
                        />
                        <div />
                        <ReadOnlyField
                            label="Phone"
                            value={client?.phone || "-"}
                        />
                        <ReadOnlyField
                            label="WhatsApp"
                            value={client?.whatsapp || "-"}
                        />
                        <ReadOnlyField
                            label="Telegram"
                            value={client?.telegram ? `@${client.telegram}` : "-"}
                        />
                        <ReadOnlyField
                            label="Email"
                            value={client?.email || "-"}
                        />
                    </div>
                </FormSection>

                {/* Document Photos */}
                {(() => {
                    try {
                        const hasPassport = client?.passportPhotos && JSON.parse(client.passportPhotos).length > 0;
                        const hasLicense = client?.driverLicensePhotos && JSON.parse(client.driverLicensePhotos).length > 0;
                        
                        if (!hasPassport && !hasLicense) return null;

                        return (
                            <Card>
                                <div className="flex">
                                    {/* Passport */}
                                    {hasPassport && (
                                        <div className="w-1/3">
                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Passport</h4>
                                            <div className="flex items-center gap-2">
                                                {JSON.parse(client.passportPhotos!).map((photo: string, index: number) => (
                                                    <div
                                                        key={index}
                                                        className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50"
                                                    >
                                                        <img
                                                            src={photo}
                                                            alt={`Passport ${index + 1}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Driver License */}
                                    {hasLicense && (
                                        <div className="w-1/3 flex justify-center">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-900 mb-2">Driver License</h4>
                                                <div className="flex items-center gap-2">
                                                    {JSON.parse(client.driverLicensePhotos!).map((photo: string, index: number) => (
                                                        <div
                                                            key={index}
                                                            className="w-20 h-20 rounded-lg overflow-hidden bg-gray-50"
                                                        >
                                                            <img
                                                                src={photo}
                                                                alt={`Driver License ${index + 1}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    } catch {
                        return null;
                    }
                })()}

                {/* Extras */}
                <FormSection
                    title="Extras"
                    icon={<CubeIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Full Insurance</span>
                            <span className="text-sm text-gray-600">
                                {contract.fullInsuranceEnabled ? "Yes" : "No"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Island Trip</span>
                            <span className="text-sm text-gray-600">
                                {contract.islandTripEnabled ? "Yes" : "No"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Krabi Trip</span>
                            <span className="text-sm text-gray-600">
                                {contract.krabiTripEnabled ? "Yes" : "No"}
                            </span>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium text-gray-700">Baby Seat</span>
                            <span className="text-sm text-gray-600">
                                {contract.babySeatEnabled ? "Yes" : "No"}
                            </span>
                        </div>
                    </div>
                </FormSection>

                {/* Financial Summary */}
                <FormSection
                    title="Financial Summary"
                    icon={<BanknotesIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <ReadOnlyField
                            label="Delivery Price"
                            value={contract.deliveryCost ? `${contract.deliveryCost} ฿` : "0 ฿"}
                        />
                        <ReadOnlyField
                            label="Return Price"
                            value={contract.returnCost ? `${contract.returnCost} ฿` : "0 ฿"}
                        />
                        <ReadOnlyField
                            label="Deposit Payment"
                            value={contract.depositAmount ? `${contract.depositAmount} ${contract.depositCurrency || "THB"}` : "-"}
                        />
                        <ReadOnlyField
                            label="Total Rental Cost"
                            value={contract.totalAmount ? `${contract.totalAmount} ${contract.totalCurrency || "THB"}` : "-"}
                        />
                    </div>
                </FormSection>

                {/* Notes */}
                {contract.notes && (
                    <FormSection
                        title="Notes & Terms"
                        icon={<DocumentTextIcon className="w-6 h-6" />}
                    >
                        <ReadOnlyField
                            label="Contract Notes"
                            value={contract.notes}
                        />
                    </FormSection>
                )}
            </div>
        </div>
    );
}
