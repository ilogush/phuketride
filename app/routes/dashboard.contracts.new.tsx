import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate, useSearchParams } from "react-router";
import { useState, useEffect } from "react";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import { requireAuth } from "~/lib/auth.server";
import { companyCars, districts, users } from "~/db/schema";
import * as schema from "~/db/schema";
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
import { useToast } from "~/lib/toast";
import { contractSchema } from "~/schemas/contract";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
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
    const db = drizzle(context.cloudflare.env.DB, { schema });

    // Get available company cars (not rented)
    const cars = await db.query.companyCars.findMany({
        where: (cars, { eq, and, isNull }) => and(
            eq(cars.companyId, user.companyId!),
            eq(cars.status, 'available'),
            isNull(cars.archivedAt)
        ),
        with: {
            template: {
                with: {
                    brand: true,
                    model: true,
                }
            },
            color: true,
        }
    });

    // Get districts
    const districtsList = await db.query.districts.findMany({
        where: (d, { eq }) => eq(d.isActive, true),
    });

    // Get payment templates for contract creation (show_on_create = 1)
    const paymentTemplates = await db.query.paymentTypes.findMany({
        where: (pt, { eq, and, or, isNull }) => and(
            eq(pt.isActive, true),
            eq(pt.showOnCreate, true),
            or(
                isNull(pt.companyId),
                eq(pt.companyId, user.companyId!)
            )
        ),
    });

    // Get active currencies for company
    const currencies = await db.query.currencies.findMany({
        where: (c, { eq, and, or, isNull }) => and(
            eq(c.isActive, true),
            or(
                isNull(c.companyId),
                eq(c.companyId, user.companyId!)
            )
        ),
    });

    return { 
        cars: cars.map(car => ({
            id: car.id,
            name: `${car.template?.brand?.name || ''} ${car.template?.model?.name || ''} - ${car.licensePlate}`,
            pricePerDay: car.pricePerDay,
            deposit: car.deposit,
        })),
        districts: districtsList,
        paymentTemplates,
        currencies,
    };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    try {
        // Parse client data
        const passportNumber = formData.get("clientPassport") as string;
        const clientData = {
            name: formData.get("clientName") as string,
            surname: formData.get("clientSurname") as string,
            email: formData.get("clientEmail") as string,
            phone: formData.get("clientPhone") as string,
            dateOfBirth: formData.get("dateOfBirth") ? new Date(formData.get("dateOfBirth") as string) : null,
            citizenship: formData.get("citizenship") as string,
        };

        // Check if client exists by passport_number
        let clientId: string;
        const existingClient = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.passportNumber, passportNumber),
        });

        if (existingClient) {
            // Check if all data matches
            const dataMatches = 
                existingClient.name === clientData.name &&
                existingClient.surname === clientData.surname &&
                existingClient.email === clientData.email &&
                existingClient.phone === clientData.phone &&
                existingClient.citizenship === clientData.citizenship;

            if (dataMatches) {
                // Use existing client
                clientId = existingClient.id;
            } else {
                // Data changed - create new user
                clientId = crypto.randomUUID();
                await db.insert(schema.users).values({
                    id: clientId,
                    email: clientData.email || `${clientData.phone}@temp.com`,
                    role: "user",
                    name: clientData.name,
                    surname: clientData.surname,
                    phone: clientData.phone,
                    passportNumber: passportNumber,
                    citizenship: clientData.citizenship,
                    dateOfBirth: clientData.dateOfBirth,
                });
            }
        } else {
            // Client not found - create new
            clientId = crypto.randomUUID();
            await db.insert(schema.users).values({
                id: clientId,
                email: clientData.email || `${clientData.phone}@temp.com`,
                role: "user",
                name: clientData.name,
                surname: clientData.surname,
                phone: clientData.phone,
                passportNumber: passportNumber,
                citizenship: clientData.citizenship,
                dateOfBirth: clientData.dateOfBirth,
            });
        }

        // Parse contract data
        const companyCarId = Number(formData.get("companyCarId"));
        const startDate = new Date(formData.get("startDate") as string);
        const endDate = new Date(formData.get("endDate") as string);
        const totalAmount = Number(formData.get("totalAmount"));
        const depositAmount = Number(formData.get("depositAmount"));
        const totalCurrency = formData.get("totalCurrency") as string || "THB";

        // Create contract
        const [newContract] = await db.insert(schema.contracts).values({
            companyCarId,
            clientId,
            managerId: user.id,
            startDate,
            endDate,
            totalAmount,
            totalCurrency,
            depositAmount,
            depositCurrency: totalCurrency,
            depositPaymentMethod: formData.get("depositPaymentMethod") as any,
            fullInsuranceEnabled: formData.get("fullInsurance") === "true",
            fullInsurancePrice: Number(formData.get("fullInsurancePrice")) || 0,
            babySeatEnabled: formData.get("babySeat") === "true",
            babySeatPrice: Number(formData.get("babySeatPrice")) || 0,
            islandTripEnabled: formData.get("islandTrip") === "true",
            islandTripPrice: Number(formData.get("islandTripPrice")) || 0,
            krabiTripEnabled: formData.get("krabiTrip") === "true",
            krabiTripPrice: Number(formData.get("krabiTripPrice")) || 0,
            pickupDistrictId: Number(formData.get("pickupDistrictId")) || null,
            pickupHotel: formData.get("pickupHotel") as string || null,
            pickupRoom: formData.get("pickupRoom") as string || null,
            deliveryCost: Number(formData.get("deliveryCost")) || 0,
            returnDistrictId: Number(formData.get("returnDistrictId")) || null,
            returnHotel: formData.get("returnHotel") as string || null,
            returnRoom: formData.get("returnRoom") as string || null,
            returnCost: Number(formData.get("returnCost")) || 0,
            startMileage: Number(formData.get("startMileage")) || 0,
            fuelLevel: formData.get("fuelLevel") as string || "full",
            cleanliness: formData.get("cleanliness") as string || "clean",
            status: "active",
            notes: formData.get("notes") as string || null,
        }).returning({ id: schema.contracts.id });

        // Create payments from selected templates
        const paymentCount = Number(formData.get("paymentCount")) || 0;
        for (let i = 0; i < paymentCount; i++) {
            const paymentTypeId = Number(formData.get(`payment_${i}_type`));
            const amount = Number(formData.get(`payment_${i}_amount`));
            const currencyId = Number(formData.get(`payment_${i}_currency`));
            const paymentMethod = formData.get(`payment_${i}_method`) as string;

            if (paymentTypeId && amount > 0) {
                await db.insert(schema.payments).values({
                    contractId: newContract.id,
                    paymentTypeId,
                    amount,
                    currencyId,
                    paymentMethod: paymentMethod as any,
                    status: "completed",
                    createdBy: user.id,
                });
            }
        }

        // Update car status to 'rented'
        await db.update(schema.companyCars)
            .set({ status: 'rented' })
            .where(eq(schema.companyCars.id, companyCarId));

        // Audit log
        const metadata = getRequestMetadata(request);
        quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "contract",
            entityId: newContract.id,
            action: "create",
            afterState: { contractId: newContract.id, clientId, companyCarId },
            ...metadata,
        });

        return redirect(`/contracts?success=${encodeURIComponent("Contract created successfully")}`);
    } catch (error) {
        console.error("Failed to create contract:", error);
        return redirect(`/contracts/new?error=${encodeURIComponent("Failed to create contract")}`);
    }
}

export default function NewContract() {
    const { cars, districts, paymentTemplates, currencies } = useLoaderData<typeof loader>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const toast = useToast();
    const { validateLatinInput } = useLatinValidation();

    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000));
    const [fullInsurance, setFullInsurance] = useState(false);
    const [islandTrip, setIslandTrip] = useState(false);
    const [krabiTrip, setKrabiTrip] = useState(false);
    const [babySeat, setBabySeat] = useState(false);
    const [carPhotos, setCarPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [passportPhotos, setPassportPhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [driverLicensePhotos, setDriverLicensePhotos] = useState<Array<{ base64: string; fileName: string }>>([]);
    const [selectedPayments, setSelectedPayments] = useState<Array<{ templateId: number; amount: number; currencyId: number; method: string }>>([]);

    // Toast notifications
    useEffect(() => {
        const error = searchParams.get("error");
        if (error) {
            toast.error(error);
        }
    }, [searchParams, toast]);

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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

                {/* Payments */}
                <FormSection
                    title="Payments"
                    icon={<BanknotesIcon className="w-6 h-6" />}
                >
                    <div className="space-y-4">
                        {paymentTemplates.map((template, index) => (
                            <div key={template.id} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`payment_${index}`}
                                        className="w-4 h-4 text-gray-800 border-gray-300 rounded focus:ring-gray-800"
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedPayments([...selectedPayments, { 
                                                    templateId: template.id, 
                                                    amount: 0, 
                                                    currencyId: currencies[0]?.id || 1,
                                                    method: 'cash'
                                                }]);
                                            } else {
                                                setSelectedPayments(selectedPayments.filter(p => p.templateId !== template.id));
                                            }
                                        }}
                                    />
                                    <label htmlFor={`payment_${index}`} className="ml-2 text-sm font-medium text-gray-700">
                                        {template.name} ({template.sign})
                                    </label>
                                </div>
                                <FormInput
                                    label="Amount"
                                    name={`payment_${index}_amount`}
                                    type="number"
                                    placeholder="0.00"
                                    disabled={!selectedPayments.find(p => p.templateId === template.id)}
                                />
                                <FormSelect
                                    label="Currency"
                                    name={`payment_${index}_currency`}
                                    options={currencies.map(c => ({ id: c.id, name: `${c.code} (${c.symbol})` }))}
                                    disabled={!selectedPayments.find(p => p.templateId === template.id)}
                                />
                                <FormSelect
                                    label="Method"
                                    name={`payment_${index}_method`}
                                    options={[
                                        { id: 'cash', name: 'Cash' },
                                        { id: 'bank_transfer', name: 'Bank Transfer' },
                                        { id: 'card', name: 'Card' },
                                    ]}
                                    disabled={!selectedPayments.find(p => p.templateId === template.id)}
                                />
                                <input type="hidden" name={`payment_${index}_type`} value={template.id} />
                            </div>
                        ))}
                        <input type="hidden" name="paymentCount" value={paymentTemplates.length} />
                    </div>
                </FormSection>

                {/* Financial Summary */}
                <FormSection
                    title="Financial Summary"
                    icon={<BanknotesIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
                    <Textarea
                        label="Contract Notes"
                        name="notes"
                        rows={4}
                        placeholder="Add any extra information (flight info, car condition, etc.)"
                    />
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
