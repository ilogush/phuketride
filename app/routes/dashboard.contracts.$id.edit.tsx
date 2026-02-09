import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { requireAuth } from "~/lib/auth.server";
import { contracts, companyCars, districts, users } from "~/db/schema";
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
    const db = drizzle(context.cloudflare.env.DB);
    const contractId = parseInt(params.id!);

    // Get contract
    const [contract] = await db
        .select()
        .from(contracts)
        .where(eq(contracts.id, contractId))
        .limit(1);

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    // Get company cars
    const cars = await db
        .select({
            id: companyCars.id,
            name: companyCars.licensePlate,
        })
        .from(companyCars)
        .where(eq(companyCars.companyId, user.companyId!));

    // Get districts
    const districtsList = await db
        .select({
            id: districts.id,
            name: districts.name,
        })
        .from(districts);

    // Get client
    const [client] = await db
        .select()
        .from(users)
        .where(eq(users.id, contract.clientId))
        .limit(1);

    return { contract, cars, districts: districtsList, client };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();
    const contractId = parseInt(params.id!);

    // TODO: Implement contract update logic
    // For now, just redirect back
    return redirect(`/contracts/${contractId}`);
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
                title={`Edit Contract #${contract.id}`}
                leftActions={<BackButton />}
            />

            <Form method="post" className="space-y-4">
                {/* Car Details */}
                <FormSection
                    title="Car Details"
                    icon={<TruckIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-4 gap-6">
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
                        currentPhotos={(() => {
                            try {
                                return contract.photos ? JSON.parse(contract.photos) : [];
                            } catch {
                                return [];
                            }
                        })()}
                        onPhotosChange={setCarPhotos}
                        maxPhotos={12}
                    />
                </div>

                {/* Rental Details */}
                <FormSection
                    title="Rental Details"
                    icon={<CalendarIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-4 gap-6">
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
                    <div className="grid grid-cols-4 gap-6">
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
                    <DocumentPhotosUpload
                        onPassportPhotosChange={setPassportPhotos}
                        onDriverLicensePhotosChange={setDriverLicensePhotos}
                    />
                </div>

                {/* Extras */}
                <FormSection
                    title="Extras"
                    icon={<CubeIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-4 gap-6">
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
                    <div className="grid grid-cols-4 gap-6">
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
                        value={contract.notes || ""}
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
                        Save Changes
                    </Button>
                </div>
            </Form>
        </div>
    );
}
