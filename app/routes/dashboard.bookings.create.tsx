import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, useActionData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq } from "drizzle-orm";
import * as schema from "~/db/schema";
import { z } from "zod";
import { ArrowLeftIcon, CalendarIcon, MapPinIcon, TruckIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router";
import Button from "~/components/dashboard/Button";
import FormField from "~/components/dashboard/FormField";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { format, addDays } from "date-fns";

const bookingSchema = z.object({
    carId: z.string().min(1, "Car is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    pickupDistrictId: z.string().optional(),
    pickupHotel: z.string().optional(),
    pickupRoom: z.string().optional(),
    returnDistrictId: z.string().optional(),
    returnHotel: z.string().optional(),
    returnRoom: z.string().optional(),
    fullInsurance: z.string().optional(),
    babySeat: z.string().optional(),
    islandTrip: z.string().optional(),
    krabiTrip: z.string().optional(),
    notes: z.string().optional(),
});

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });

    // Get available cars (simplified - should check availability by dates)
    const cars = await db
        .select({
            id: schema.companyCars.id,
            licensePlate: schema.companyCars.licensePlate,
            year: schema.companyCars.year,
            pricePerDay: schema.companyCars.pricePerDay,
            deposit: schema.companyCars.deposit,
            status: schema.companyCars.status,
            brandName: schema.carBrands.name,
            modelName: schema.carModels.name,
            colorName: schema.colors.name,
            companyId: schema.companyCars.companyId,
        })
        .from(schema.companyCars)
        .leftJoin(schema.carTemplates, eq(schema.companyCars.templateId, schema.carTemplates.id))
        .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
        .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
        .leftJoin(schema.colors, eq(schema.companyCars.colorId, schema.colors.id))
        .where(eq(schema.companyCars.status, "available"))
        .limit(50);

    // Get districts for pickup/return
    const districts = await db
        .select({
            id: schema.districts.id,
            name: schema.districts.name,
            deliveryPrice: schema.districts.deliveryPrice,
        })
        .from(schema.districts)
        .where(eq(schema.districts.isActive, true));

    return { cars, districts, user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    
    const formData = await request.formData();
    const data = Object.fromEntries(formData);

    const result = bookingSchema.safeParse(data);
    if (!result.success) {
        return { error: "Validation failed", details: result.error.flatten() };
    }

    const { carId, startDate, endDate, pickupDistrictId, pickupHotel, pickupRoom, 
            returnDistrictId, returnHotel, returnRoom, fullInsurance, babySeat, 
            islandTrip, krabiTrip, notes } = result.data;

    // Get car details
    const [car] = await db
        .select()
        .from(schema.companyCars)
        .where(eq(schema.companyCars.id, Number(carId)))
        .limit(1);

    if (!car) {
        return { error: "Car not found" };
    }

    // Calculate rental days
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 1) {
        return { error: "End date must be after start date" };
    }

    // Calculate total amount
    let totalAmount = car.pricePerDay * days;
    let fullInsurancePrice = 0;
    let babySeatPrice = 0;
    let islandTripPrice = 0;
    let krabiTripPrice = 0;
    let deliveryCost = 0;
    let returnCost = 0;

    if (fullInsurance === "on") {
        fullInsurancePrice = (car.fullInsuranceMinPrice || 0) * days;
        totalAmount += fullInsurancePrice;
    }

    if (babySeat === "on") {
        // Get company settings for baby seat price
        const [company] = await db
            .select()
            .from(schema.companies)
            .where(eq(schema.companies.id, car.companyId))
            .limit(1);
        
        babySeatPrice = (company?.babySeatPricePerDay || 0) * days;
        totalAmount += babySeatPrice;
    }

    if (islandTrip === "on") {
        const [company] = await db
            .select()
            .from(schema.companies)
            .where(eq(schema.companies.id, car.companyId))
            .limit(1);
        
        islandTripPrice = company?.islandTripPrice || 0;
        totalAmount += islandTripPrice;
    }

    if (krabiTrip === "on") {
        const [company] = await db
            .select()
            .from(schema.companies)
            .where(eq(schema.companies.id, car.companyId))
            .limit(1);
        
        krabiTripPrice = company?.krabiTripPrice || 0;
        totalAmount += krabiTripPrice;
    }

    if (pickupDistrictId) {
        const [district] = await db
            .select()
            .from(schema.districts)
            .where(eq(schema.districts.id, Number(pickupDistrictId)))
            .limit(1);
        
        deliveryCost = district?.deliveryPrice || 0;
        totalAmount += deliveryCost;
    }

    if (returnDistrictId) {
        const [district] = await db
            .select()
            .from(schema.districts)
            .where(eq(schema.districts.id, Number(returnDistrictId)))
            .limit(1);
        
        returnCost = district?.deliveryPrice || 0;
        totalAmount += returnCost;
    }

    // Create contract
    const [newContract] = await db
        .insert(schema.contracts)
        .values({
            companyCarId: Number(carId),
            clientId: user.id,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            totalAmount,
            totalCurrency: "THB",
            depositAmount: car.deposit,
            depositCurrency: "THB",
            fullInsuranceEnabled: fullInsurance === "on",
            fullInsurancePrice,
            babySeatEnabled: babySeat === "on",
            babySeatPrice,
            islandTripEnabled: islandTrip === "on",
            islandTripPrice,
            krabiTripEnabled: krabiTrip === "on",
            krabiTripPrice,
            pickupDistrictId: pickupDistrictId ? Number(pickupDistrictId) : null,
            pickupHotel: pickupHotel || null,
            pickupRoom: pickupRoom || null,
            deliveryCost,
            returnDistrictId: returnDistrictId ? Number(returnDistrictId) : null,
            returnHotel: returnHotel || null,
            returnRoom: returnRoom || null,
            returnCost,
            status: "draft",
            notes: notes || null,
        })
        .returning();

    return redirect(`/dashboard/my-contracts/${newContract.id}`);
}

export default function CreateBooking() {
    const { cars, districts, user } = useLoaderData<typeof loader>();
    const actionData = useActionData<typeof action>();

    const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
    const nextWeek = format(addDays(new Date(), 8), "yyyy-MM-dd");

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/dashboard/my-bookings">
                    <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Create Booking</h1>
                    <p className="text-sm text-gray-500 mt-1">Book your next rental</p>
                </div>
            </div>

            {actionData?.error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-red-800 font-medium">{actionData.error}</p>
                </div>
            )}

            <Form method="post" className="space-y-6">
                {/* Car Selection */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <TruckIcon className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-semibold">Select Vehicle</h2>
                    </div>
                    <FormField label="Car" required>
                        <FormSelect name="carId" required>
                            <option value="">Choose a car</option>
                            {cars.map((car) => (
                                <option key={car.id} value={car.id}>
                                    {car.brandName} {car.modelName} {car.year} ({car.licensePlate}) - ฿{car.pricePerDay}/day
                                </option>
                            ))}
                        </FormSelect>
                    </FormField>
                </div>

                {/* Dates */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <CalendarIcon className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-semibold">Rental Period</h2>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <FormField label="Start Date" required>
                            <FormInput
                                type="date"
                                name="startDate"
                                min={tomorrow}
                                required
                            />
                        </FormField>
                        <FormField label="End Date" required>
                            <FormInput
                                type="date"
                                name="endDate"
                                min={nextWeek}
                                required
                            />
                        </FormField>
                    </div>
                </div>

                {/* Pickup & Return */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPinIcon className="h-5 w-5 text-gray-400" />
                        <h2 className="text-lg font-semibold">Pickup & Return</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <FormField label="Pickup District">
                                <FormSelect name="pickupDistrictId">
                                    <option value="">Select district</option>
                                    {districts.map((district) => (
                                        <option key={district.id} value={district.id}>
                                            {district.name} {district.deliveryPrice > 0 && `(+฿${district.deliveryPrice})`}
                                        </option>
                                    ))}
                                </FormSelect>
                            </FormField>
                            <FormField label="Hotel Name">
                                <FormInput name="pickupHotel" placeholder="Hotel name" />
                            </FormField>
                            <FormField label="Room Number">
                                <FormInput name="pickupRoom" placeholder="Room #" />
                            </FormField>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <FormField label="Return District">
                                <FormSelect name="returnDistrictId">
                                    <option value="">Select district</option>
                                    {districts.map((district) => (
                                        <option key={district.id} value={district.id}>
                                            {district.name} {district.deliveryPrice > 0 && `(+฿${district.deliveryPrice})`}
                                        </option>
                                    ))}
                                </FormSelect>
                            </FormField>
                            <FormField label="Hotel Name">
                                <FormInput name="returnHotel" placeholder="Hotel name" />
                            </FormField>
                            <FormField label="Room Number">
                                <FormInput name="returnRoom" placeholder="Room #" />
                            </FormField>
                        </div>
                    </div>
                </div>

                {/* Additional Services */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold mb-4">Additional Services</h2>
                    <div className="space-y-3">
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                            <input type="checkbox" name="fullInsurance" className="rounded" />
                            <span className="font-medium">Full Insurance</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                            <input type="checkbox" name="babySeat" className="rounded" />
                            <span className="font-medium">Baby Seat</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                            <input type="checkbox" name="islandTrip" className="rounded" />
                            <span className="font-medium">Island Trip</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                            <input type="checkbox" name="krabiTrip" className="rounded" />
                            <span className="font-medium">Krabi Trip</span>
                        </label>
                    </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-xl p-6 shadow-sm">
                    <FormField label="Notes">
                        <textarea
                            name="notes"
                            rows={4}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-800 focus:border-transparent"
                            placeholder="Any special requests or notes..."
                        />
                    </FormField>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button type="submit" variant="primary">
                        Create Booking
                    </Button>
                    <Link to="/dashboard/my-bookings">
                        <Button type="button" variant="secondary">
                            Cancel
                        </Button>
                    </Link>
                </div>
            </Form>
        </div>
    );
}
