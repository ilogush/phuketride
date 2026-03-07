import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { useDateMasking } from "~/lib/useDateMasking";
import { parseDateFromDisplay } from "~/lib/formatters";
import { calculateBaseTripTotal } from "~/lib/pricing";
import { createBookingAction } from "~/lib/bookings-create.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { useUrlToast } from "~/lib/useUrlToast";
import { loadRentalCreateBaseData } from "~/lib/rental-create-page.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { companyId, user } = await requireScopedDashboardAccess(request);
    const scopedCompanyId = companyId!;
    return trackServerOperation({
        event: "bookings.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: scopedCompanyId,
        details: { route: "bookings.create" },
        run: async () => loadRentalCreateBaseData(context.cloudflare.env.DB, scopedCompanyId),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request);
    const formData = await request.formData();
    return trackServerOperation({
        event: "bookings.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: companyId!,
        details: { route: "bookings.create" },
        run: async () => createBookingAction({ request, context, user, companyId: companyId!, formData }),
    });
}

export default function CreateBookingPage() {
    const { cars, districts } = useLoaderData<typeof loader>();
    const { validateLatinInput } = useLatinValidation();
    const { maskDateInput } = useDateMasking();
    useUrlToast();

    // Live pricing calculation
    const [selectedCarId, setSelectedCarId] = useState<string>("");
    const [dates, setDates] = useState({ start: "", end: "" });
    const [extras, setExtras] = useState({
        insurance: 0,
        babySeat: 0,
        islandTrip: 0,
        krabiTrip: 0
    });

    const selectedCar = cars.find((c) => String(c.id) === selectedCarId);

    const tripPricing = (() => {
        if (!selectedCar || !dates.start || !dates.end || dates.start.length < 10 || dates.end.length < 10) {
            return { days: 0, baseAmount: 0 };
        }
        try {
            const s = new Date(parseDateFromDisplay(dates.start));
            const e = new Date(parseDateFromDisplay(dates.end));
            if (isNaN(s.getTime()) || isNaN(e.getTime())) return { days: 0, baseAmount: 0 };
            const { days, total } = calculateBaseTripTotal(selectedCar.pricePerDay, s, e);
            return { days, baseAmount: total };
        } catch {
            return { days: 0, baseAmount: 0 };
        }
    })();

    const days = tripPricing.days;
    const baseAmount = tripPricing.baseAmount;
    const extrasAmount = (extras.insurance * days) + (extras.babySeat * days) + extras.islandTrip + extras.krabiTrip;
    const totalAmount = baseAmount + extrasAmount;

    return (
        <div className="space-y-6">
            <PageHeader
                title="Create Booking"
                leftActions={<BackButton to="/bookings" />}
                rightActions={
                    <Button type="submit" variant="primary" form="create-booking-form">
                        Create Booking
                    </Button>
                }
            />

            <Form id="create-booking-form" method="post" className="space-y-6">
                <FormSection title="Car Selection" icon={<ArrowLeftIcon className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormSelect
                            name="carId"
                            label="Car"
                            required
                            className="col-span-full"
                            value={selectedCarId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCarId(e.target.value)}
                            options={cars.map((car: { id: number; name: string; pricePerDay: number }) => ({ id: car.id, name: `${car.name} - ${car.pricePerDay} THB/day` }))}
                            placeholder="Select car"
                        />
                        <FormInput
                            type="text"
                            name="startDate"
                            label="Start Date"
                            placeholder="DD/MM/YYYY"
                            required
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                maskDateInput(e);
                                setDates(prev => ({ ...prev, start: e.target.value }));
                            }}
                        />
                        <FormInput
                            type="text"
                            name="endDate"
                            label="End Date"
                            placeholder="DD/MM/YYYY"
                            required
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                maskDateInput(e);
                                setDates(prev => ({ ...prev, end: e.target.value }));
                            }}
                        />
                    </div>
                </FormSection>

                {totalAmount > 0 && (
                    <div className="bg-gray-800 text-white p-4 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Estimated Total</p>
                                <p className="text-2xl font-bold">{totalAmount.toLocaleString()} THB</p>
                            </div>
                            <div className="text-right text-sm text-gray-400">
                                <p>{days} days @ {selectedCar?.pricePerDay} THB</p>
                                {extrasAmount > 0 && <p>+ {extrasAmount.toLocaleString()} THB extras</p>}
                            </div>
                        </div>
                    </div>
                )}

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
                            options={districts.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }))}
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
                            options={districts.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }))}
                        />
                        <FormInput name="returnHotel" label="Hotel" />
                        <FormInput name="returnRoom" label="Room" />
                    </div>
                </FormSection>

                <FormSection title="Additional Services">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <FormInput
                            type="number"
                            name="fullInsurance"
                            label="Full Insurance (per day)"
                            step="0.01"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtras(prev => ({ ...prev, insurance: Number(e.target.value) || 0 }))}
                        />
                        <FormInput
                            type="number"
                            name="babySeat"
                            label="Baby Seat (per day)"
                            step="0.01"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtras(prev => ({ ...prev, babySeat: Number(e.target.value) || 0 }))}
                        />
                        <FormInput
                            type="number"
                            name="islandTrip"
                            label="Island Trip (total)"
                            step="0.01"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtras(prev => ({ ...prev, islandTrip: Number(e.target.value) || 0 }))}
                        />
                        <FormInput
                            type="number"
                            name="krabiTrip"
                            label="Krabi Trip (total)"
                            step="0.01"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtras(prev => ({ ...prev, krabiTrip: Number(e.target.value) || 0 }))}
                        />
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

            </Form>
        </div>
    );
}
