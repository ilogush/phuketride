import { type LoaderFunctionArgs, type ActionFunctionArgs } from "react-router";
import { useLoaderData, Form } from "react-router";
import { useState } from "react";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Button from "~/components/dashboard/Button";
import FormSection from "~/components/dashboard/FormSection";
import { Input } from "~/components/dashboard/Input";
import { Select } from "~/components/dashboard/Select";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import { useLatinValidation } from "~/lib/useLatinValidation";
import { useDateMasking } from "~/lib/useDateMasking";
import { parseDateFromDisplay } from "~/lib/formatters";
import { calculateBaseTripTotal } from "~/lib/pricing";
import { createBookingAction } from "~/lib/bookings-create.server";
import { trackServerOperation } from "~/lib/telemetry.server";
import { loadRentalCreateBaseData } from "~/lib/rental-create-page.server";
import { requireScopedDashboardAccess } from "~/lib/access-policy.server";
import { getScopedDb } from "~/lib/db-factory.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const { companyId, user, sdb } = await getScopedDb(request, context, requireScopedDashboardAccess);
    const scopedCompanyId = companyId!;
    return trackServerOperation({
        event: "bookings.create.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId: scopedCompanyId,
        details: { route: "bookings.create" },
        run: async () => loadRentalCreateBaseData(sdb.db as any, scopedCompanyId),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId, sdb } = await getScopedDb(request, context, requireScopedDashboardAccess);
    const formData = await request.formData();
    return trackServerOperation({
        event: "bookings.create",
        scope: "route.action",
        request,
        userId: user.id,
        companyId: companyId!,
        details: { route: "bookings.create" },
        run: async () => sdb.bookings.createAction({ request, user, formData }),
    });
}

export default function CreateBookingPage() {
    const { cars, districts } = useLoaderData<typeof loader>();
    const { validateLatinInput } = useLatinValidation();
    const { maskDateInput } = useDateMasking();

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
        <div className="space-y-4">
            <PageHeader
                title="New Booking"
                leftActions={<BackButton to="/bookings" />}
                rightActions={
                    <Button type="submit" variant="solid" form="create-booking-form">
                        Create Booking
                    </Button>
                }
            />

            <Form id="create-booking-form" method="post" className="space-y-4">
                <FormSection title="Car Selection" icon={<ArrowLeftIcon className="w-5 h-5" />}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            name="carId"
                            label="Car"
                            required
                            className="col-span-full"
                            value={selectedCarId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedCarId(e.target.value)}
                            options={cars.map((car: { id: number; name: string; pricePerDay: number }) => ({ id: car.id, name: `${car.name} - ฿${car.pricePerDay}/day` }))}
                            placeholder="Select car"
                            showPlaceholderOption
                        />
                        <Input
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
                        <Input
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
                                <p className="text-2xl font-bold">฿{totalAmount.toLocaleString()}</p>
                            </div>
                            <div className="text-right text-sm text-gray-400">
                                <p>{days} days @ ฿{selectedCar?.pricePerDay}</p>
                                {extrasAmount > 0 && <p>+ ฿{extrasAmount.toLocaleString()} extras</p>}
                            </div>
                        </div>
                    </div>
                )}

                <FormSection title="Client Information">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            name="clientName"
                            label="First Name"
                            required
                            onChange={(e) => validateLatinInput(e, 'First Name')}
                        />
                        <Input
                            name="clientSurname"
                            label="Last Name"
                            required
                            onChange={(e) => validateLatinInput(e, 'Last Name')}
                        />
                        <Input name="clientPhone" label="Phone" required />
                        <Input type="email" name="clientEmail" label="Email" />
                        <Input
                            name="clientPassport"
                            label="Passport Number"
                            onChange={(e) => validateLatinInput(e, 'Passport')}
                        />
                    </div>
                </FormSection>

                <FormSection title="Deposit">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input type="number" name="depositAmount" label="Deposit Amount" step="0.01" />
                        <div className="flex items-center gap-2">
                            <input type="checkbox" name="depositPaid" id="depositPaid" className="rounded" />
                            <label htmlFor="depositPaid" className="text-sm font-medium text-gray-700">
                                Deposit Paid
                            </label>
                        </div>
                        </div>
                </FormSection>

                <FormSection title="Pickup Location">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            name="pickupDistrictId"
                            label="District"
                            placeholder="Select district"
                            options={districts.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }))}
                            showPlaceholderOption
                        />
                        <Input name="pickupHotel" label="Hotel" />
                        <Input name="pickupRoom" label="Room" />
                    </div>
                </FormSection>

                <FormSection title="Return Location">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            name="returnDistrictId"
                            label="District"
                            placeholder="Select district"
                            options={districts.map((d: { id: number; name: string }) => ({ id: d.id, name: d.name }))}
                            showPlaceholderOption
                        />
                        <Input name="returnHotel" label="Hotel" />
                        <Input name="returnRoom" label="Room" />
                    </div>
                </FormSection>

                <FormSection title="Additional Services">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Input
                            type="number"
                            name="fullInsurance"
                            label="Full Insurance (per day)"
                            step="0.01"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtras(prev => ({ ...prev, insurance: Number(e.target.value) || 0 }))}
                        />
                        <Input
                            type="number"
                            name="babySeat"
                            label="Baby Seat (per day)"
                            step="0.01"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtras(prev => ({ ...prev, babySeat: Number(e.target.value) || 0 }))}
                        />
                        <Input
                            type="number"
                            name="islandTrip"
                            label="Island Trip (total)"
                            step="0.01"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExtras(prev => ({ ...prev, islandTrip: Number(e.target.value) || 0 }))}
                        />
                        <Input
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
