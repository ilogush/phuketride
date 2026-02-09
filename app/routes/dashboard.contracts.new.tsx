import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate } from "react-router";
import { useState } from "react";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { requireAuth } from "~/lib/auth.server";
import { companyCars, districts, users } from "~/db/schema";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
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

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB);

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

    return { cars, districts: districtsList };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();

    // TODO: Implement contract creation logic
    // For now, just redirect back
    return redirect("/contracts");
}

export default function NewContract() {
    const { cars, districts } = useLoaderData<typeof loader>();
    const navigate = useNavigate();

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
                            placeholder="Select car"
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
                        <FormInput
                            label="Start Mileage"
                            name="start_mileage"
                            type="number"
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Start Date & Time <span className="text-gray-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="start_date"
                                defaultValue={startDate.toISOString().slice(0, 16)}
                                onChange={(e) => setStartDate(new Date(e.target.value))}
                                className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors"
                                required
                            />
                        </div>
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
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                End Date & Time <span className="text-gray-500">*</span>
                            </label>
                            <input
                                type="datetime-local"
                                name="end_date"
                                defaultValue={endDate.toISOString().slice(0, 16)}
                                onChange={(e) => setEndDate(new Date(e.target.value))}
                                className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors"
                                required
                            />
                        </div>
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
                    <div className="grid grid-cols-4 gap-6">
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
                            required
                        />
                        <FormInput
                            label="Last Name"
                            name="client_surname"
                            placeholder="Doe"
                            required
                        />
                        <FormInput
                            label="Citizenship"
                            name="citizenship"
                            placeholder="Type to search citizenship..."
                        />
                        <FormInput
                            label="City"
                            name="city"
                            placeholder="Type to search city..."
                        />
                        <FormSelect
                            label="Gender"
                            name="client_gender"
                            options={genderOptions}
                            placeholder="Select gender"
                        />
                        <FormInput
                            label="Birth Date"
                            name="date_of_birth"
                            type="date"
                            placeholder="DD-MM-YYYY"
                        />
                        <div />
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
                        <FormInput
                            label="Total Rental Cost"
                            name="total_amount"
                            type="number"
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
                    <div>
                        <label className="block text-xs text-gray-600 mb-1">Contract Notes</label>
                        <textarea
                            name="notes"
                            rows={4}
                            placeholder="Add any extra information (flight info, car condition, etc.)"
                            className="block w-full rounded-xl border border-gray-200 sm:text-sm py-2 px-3 bg-white text-gray-700 focus:ring-0 focus:border-gray-500 focus:outline-none transition-colors placeholder:text-xs placeholder:text-gray-500"
                        />
                    </div>
                </FormSection>

                {/* Actions */}
                <div className="flex justify-end gap-3 pt-4">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => navigate("/contracts")}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary">
                        Create Contract
                    </Button>
                </div>
            </Form>
        </div>
    );
}
