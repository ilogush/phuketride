import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, isNull, or, sql } from "drizzle-orm";
import * as schema from "~/db/schema";
import { z } from "zod";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { quickAudit, getRequestMetadata } from "~/lib/audit-logger";
import { createBookingEvents } from "~/lib/calendar-events.server";

const bookingSchema = z.object({
    carId: z.string().min(1, "Car is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    clientName: z.string().min(1, "Client name is required"),
    clientSurname: z.string().min(1, "Client surname is required"),
    clientPhone: z.string().min(9, "Phone must be at least 9 digits"),
    clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    clientPassport: z.string().optional(),
    depositAmount: z.string().optional(),
    depositPaid: z.string().optional(),
    depositPaymentMethod: z.string().optional(),
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

    if (!user.companyId) {
        throw new Response("Manager must be assigned to a company", { status: 403 });
    }

    // Get available cars
    const cars = await db.query.companyCars.findMany({
        where: and(
            eq(schema.companyCars.companyId, user.companyId),
            eq(schema.companyCars.status, "available"),
            isNull(schema.companyCars.archivedAt)
        ),
        with: {
            template: {
                with: {
                    brand: true,
                    model: true,
                }
            },
            color: true,
        },
        limit: 50,
    });

    // Get districts
    const districts = await db.query.districts.findMany({
        where: eq(schema.districts.isActive, true),
    });

    return { 
        cars: cars.map(car => ({
            id: car.id,
            name: `${car.template?.brand?.name || ''} ${car.template?.model?.name || ''} ${car.year} - ${car.licensePlate}`,
            pricePerDay: car.pricePerDay ?? 0,
            deposit: car.deposit,
        })),
        districts,
        user,
    };
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

    const { carId, startDate, endDate, clientName, clientSurname, clientPhone, clientEmail,
            clientPassport, depositAmount, depositPaid, depositPaymentMethod,
            pickupDistrictId, pickupHotel, pickupRoom, returnDistrictId, returnHotel, 
            returnRoom, fullInsurance, babySeat, islandTrip, krabiTrip, notes } = result.data;

    try {
        // Get car details
        const car = await db.query.companyCars.findFirst({
            where: and(
                eq(schema.companyCars.id, Number(carId)),
                eq(schema.companyCars.companyId, user.companyId!)
            ),
        });

        if (!car) {
            return { error: "Car not found" };
        }

        // Calculate days and amount
        const start = new Date(startDate);
        const end = new Date(endDate);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (car.pricePerDay === null) {
            return { error: "Car price per day is not set" };
        }

        let estimatedAmount = car.pricePerDay * days;

        // Add extras
        if (fullInsurance) estimatedAmount += Number(fullInsurance) * days;
        if (babySeat) estimatedAmount += Number(babySeat) * days;
        if (islandTrip) estimatedAmount += Number(islandTrip);
        if (krabiTrip) estimatedAmount += Number(krabiTrip);

        // Add delivery costs
        if (pickupDistrictId) {
            const district = await db.query.districts.findFirst({
                where: eq(schema.districts.id, Number(pickupDistrictId)),
            });
            if (district) estimatedAmount += district.deliveryPrice || 0;
        }
        if (returnDistrictId) {
            const district = await db.query.districts.findFirst({
                where: eq(schema.districts.id, Number(returnDistrictId)),
            });
            if (district) estimatedAmount += district.deliveryPrice || 0;
        }

        // Create booking
        const [booking] = await db.insert(schema.bookings).values({
            companyCarId: Number(carId),
            clientId: user.id, // Temporary, will be updated when client is created
            managerId: user.id,
            startDate: start,
            endDate: end,
            estimatedAmount,
            currency: "THB",
            depositAmount: depositAmount ? Number(depositAmount) : 0,
            depositPaid: depositPaid === "on",
            depositPaymentMethod: depositPaymentMethod as any,
            clientName,
            clientSurname,
            clientPhone,
            clientEmail: clientEmail || null,
            clientPassport: clientPassport || null,
            pickupDistrictId: pickupDistrictId ? Number(pickupDistrictId) : null,
            pickupHotel: pickupHotel || null,
            pickupRoom: pickupRoom || null,
            returnDistrictId: returnDistrictId ? Number(returnDistrictId) : null,
            returnHotel: returnHotel || null,
            returnRoom: returnRoom || null,
            fullInsuranceEnabled: !!fullInsurance,
            fullInsurancePrice: fullInsurance ? Number(fullInsurance) : 0,
            babySeatEnabled: !!babySeat,
            babySeatPrice: babySeat ? Number(babySeat) : 0,
            islandTripEnabled: !!islandTrip,
            islandTripPrice: islandTrip ? Number(islandTrip) : 0,
            krabiTripEnabled: !!krabiTrip,
            krabiTripPrice: krabiTrip ? Number(krabiTrip) : 0,
            status: "pending",
            notes: notes || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

            // Update car status to booked
            const { updateCarStatus } = await import("~/lib/contract-helpers.server");
            await updateCarStatus(db, Number(carId), 'booked', 'Booking created');

        // Create calendar events for booking
        await createBookingEvents({
            db,
            companyId: user.companyId!,
            bookingId: booking.id,
            startDate: start,
            endDate: end,
            createdBy: user.id,
        });

        // Audit log
        const metadata = getRequestMetadata(request);
        await quickAudit({
            db,
            userId: user.id,
            role: user.role,
            companyId: user.companyId,
            entityType: "booking",
            entityId: booking.id,
            action: "create",
            afterState: booking,
            ...metadata,
        });

        return redirect(`/dashboard/bookings?success=Booking created successfully`);
    } catch (error) {
        console.error("Failed to create booking:", error);
        return { error: "Failed to create booking" };
    }
}

export default function CreateBookingPage() {
    const { cars, districts, user } = useLoaderData<typeof loader>();
    const { validateLatinInput } = useLatinValidation();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Create Booking"
                leftActions={<BackButton to="/dashboard/bookings" />}
            />

            <Form method="post" className="space-y-6">
                <FormSection title="Car Selection" icon={<ArrowLeftIcon className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormSelect
                            name="carId"
                            label="Car"
                            required
                            className="col-span-full"
                            options={cars.map((car) => ({ id: car.id, name: `${car.name} - ${car.pricePerDay} THB/day` }))}
                            placeholder="Select car"
                        />
                        <FormInput type="date" name="startDate" label="Start Date" required />
                        <FormInput type="date" name="endDate" label="End Date" required />
                    </div>
                </FormSection>

                <FormSection title="Client Information">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput 
                            name="clientName" 
                            label="First Name" 
                            required 
                            onChange={(e) => validateLatinInput(e, 'First Name')}
                        />
                        <FormInput 
                            name="clientSurname" 
                            label="Last Name" 
                            required 
                            onChange={(e) => validateLatinInput(e, 'Last Name')}
                        />
                        <FormInput name="clientPhone" label="Phone" required />
                        <FormInput type="email" name="clientEmail" label="Email" />
                        <FormInput 
                            name="clientPassport" 
                            label="Passport Number" 
                            onChange={(e) => validateLatinInput(e, 'Passport')}
                        />
                    </div>
                </FormSection>

                <FormSection title="Deposit">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput type="number" name="depositAmount" label="Deposit Amount" step="0.01" />
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="depositPaid" id="depositPaid" className="rounded" />
                            <label htmlFor="depositPaid" className="text-sm font-medium text-gray-700">
                                Deposit Paid
                            </label>
                        </div>
                        <FormSelect
                            name="depositPaymentMethod"
                            label="Payment Method"
                            placeholder="Select method"
                            options={[
                                { id: "cash", name: "Cash" },
                                { id: "bank_transfer", name: "Bank Transfer" },
                                { id: "card", name: "Card" },
                            ]}
                        />
                    </div>
                </FormSection>

                <FormSection title="Pickup Location">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormSelect
                            name="pickupDistrictId"
                            label="District"
                            placeholder="Select district"
                            options={districts.map((d) => ({ id: d.id, name: d.name }))}
                        />
                        <FormInput name="pickupHotel" label="Hotel" />
                        <FormInput name="pickupRoom" label="Room" />
                    </div>
                </FormSection>

                <FormSection title="Return Location">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormSelect
                            name="returnDistrictId"
                            label="District"
                            placeholder="Select district"
                            options={districts.map((d) => ({ id: d.id, name: d.name }))}
                        />
                        <FormInput name="returnHotel" label="Hotel" />
                        <FormInput name="returnRoom" label="Room" />
                    </div>
                </FormSection>

                <FormSection title="Additional Services">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput type="number" name="fullInsurance" label="Full Insurance (per day)" step="0.01" />
                        <FormInput type="number" name="babySeat" label="Baby Seat (per day)" step="0.01" />
                        <FormInput type="number" name="islandTrip" label="Island Trip (total)" step="0.01" />
                        <FormInput type="number" name="krabiTrip" label="Krabi Trip (total)" step="0.01" />
                    </div>
                </FormSection>

                <FormSection title="Notes">
                    <textarea
                        name="notes"
                        rows={3}
                        className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800"
                        placeholder="Additional notes..."
                    />
                </FormSection>

                <div className="flex gap-4">
                    <Button type="submit" variant="primary">
                        Create Booking
                    </Button>
                    <Link to="/dashboard/bookings">
                        <Button type="button" variant="secondary">
                            Cancel
                        </Button>
                    </Link>
                </div>
            </Form>
        </div>
    );
}
