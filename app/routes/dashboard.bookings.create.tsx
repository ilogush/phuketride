import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
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

    if (!user.companyId) {
        throw new Response("Manager must be assigned to a company", { status: 403 });
    }

    const [carsRaw, districts] = await Promise.all([
        context.cloudflare.env.DB
            .prepare(`
                SELECT
                    cc.id,
                    cc.price_per_day AS pricePerDay,
                    cc.deposit,
                    cc.license_plate AS licensePlate,
                    cc.year,
                    cb.name AS brandName,
                    cm.name AS modelName
                FROM company_cars cc
                LEFT JOIN car_templates ct ON ct.id = cc.template_id
                LEFT JOIN car_brands cb ON cb.id = ct.brand_id
                LEFT JOIN car_models cm ON cm.id = ct.model_id
                WHERE cc.company_id = ? AND cc.status = 'available' AND cc.archived_at IS NULL
                LIMIT 50
            `)
            .bind(user.companyId)
            .all()
            .then((r: any) => r.results || []),
        context.cloudflare.env.DB
            .prepare("SELECT * FROM districts WHERE is_active = 1")
            .all()
            .then((r: any) => r.results || []),
    ]);

    return { 
        cars: carsRaw.map((car: any) => ({
            id: car.id,
            name: `${car.brandName || ""} ${car.modelName || ""} ${car.year || ""} - ${car.licensePlate}`,
            pricePerDay: car.pricePerDay ?? 0,
            deposit: car.deposit ?? 0,
        })),
        districts,
        user,
    };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
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
        const car = await context.cloudflare.env.DB
            .prepare(`
                SELECT id, price_per_day AS pricePerDay
                FROM company_cars
                WHERE id = ? AND company_id = ?
                LIMIT 1
            `)
            .bind(Number(carId), user.companyId)
            .first<any>();

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
            const district = await context.cloudflare.env.DB
                .prepare("SELECT delivery_price AS deliveryPrice FROM districts WHERE id = ? LIMIT 1")
                .bind(Number(pickupDistrictId))
                .first<any>();
            if (district) estimatedAmount += district.deliveryPrice || 0;
        }
        if (returnDistrictId) {
            const district = await context.cloudflare.env.DB
                .prepare("SELECT delivery_price AS deliveryPrice FROM districts WHERE id = ? LIMIT 1")
                .bind(Number(returnDistrictId))
                .first<any>();
            if (district) estimatedAmount += district.deliveryPrice || 0;
        }

        // Create booking
        const insertResult = await context.cloudflare.env.DB
            .prepare(`
                INSERT INTO bookings (
                    company_car_id, client_id, manager_id, start_date, end_date, estimated_amount, currency,
                    deposit_amount, deposit_paid, deposit_payment_method, client_name, client_surname, client_phone,
                    client_email, client_passport, pickup_district_id, pickup_hotel, pickup_room, return_district_id,
                    return_hotel, return_room, full_insurance_enabled, full_insurance_price, baby_seat_enabled,
                    baby_seat_price, island_trip_enabled, island_trip_price, krabi_trip_enabled, krabi_trip_price,
                    status, notes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, 'THB', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
            `)
            .bind(
                Number(carId),
                user.id,
                user.id,
                start.toISOString(),
                end.toISOString(),
                estimatedAmount,
                depositAmount ? Number(depositAmount) : 0,
                depositPaid === "on" ? 1 : 0,
                depositPaymentMethod || null,
                clientName,
                clientSurname,
                clientPhone,
                clientEmail || null,
                clientPassport || null,
                pickupDistrictId ? Number(pickupDistrictId) : null,
                pickupHotel || null,
                pickupRoom || null,
                returnDistrictId ? Number(returnDistrictId) : null,
                returnHotel || null,
                returnRoom || null,
                fullInsurance ? 1 : 0,
                fullInsurance ? Number(fullInsurance) : 0,
                babySeat ? 1 : 0,
                babySeat ? Number(babySeat) : 0,
                islandTrip ? 1 : 0,
                islandTrip ? Number(islandTrip) : 0,
                krabiTrip ? 1 : 0,
                krabiTrip ? Number(krabiTrip) : 0,
                notes || null,
                new Date().toISOString(),
                new Date().toISOString()
            )
            .run();
        const booking = { id: Number(insertResult.meta.last_row_id) };

        // Update car status to booked
        const { updateCarStatus } = await import("~/lib/contract-helpers.server");
        await updateCarStatus(context.cloudflare.env.DB, Number(carId), 'booked', 'Booking created');

        // Audit log
        const metadata = getRequestMetadata(request);
        await quickAudit({
            db: context.cloudflare.env.DB,
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
    } catch {
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
