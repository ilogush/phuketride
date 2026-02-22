import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { ArrowLeftIcon, CalendarIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import BackButton from "~/components/dashboard/BackButton";
import Card from "~/components/dashboard/Card";
import StatusBadge from "~/components/dashboard/StatusBadge";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const { id } = params;

    if (!id) {
        throw new Response("Contract ID is required", { status: 400 });
    }

    const contract = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                c.id,
                c.start_date AS startDate,
                c.end_date AS endDate,
                c.actual_end_date AS actualEndDate,
                c.total_amount AS totalAmount,
                c.total_currency AS totalCurrency,
                c.deposit_amount AS depositAmount,
                c.deposit_currency AS depositCurrency,
                c.deposit_payment_method AS depositPaymentMethod,
                c.full_insurance_enabled AS fullInsuranceEnabled,
                c.full_insurance_price AS fullInsurancePrice,
                c.baby_seat_enabled AS babySeatEnabled,
                c.baby_seat_price AS babySeatPrice,
                c.island_trip_enabled AS islandTripEnabled,
                c.island_trip_price AS islandTripPrice,
                c.krabi_trip_enabled AS krabiTripEnabled,
                c.krabi_trip_price AS krabiTripPrice,
                c.pickup_hotel AS pickupHotel,
                c.pickup_room AS pickupRoom,
                c.delivery_cost AS deliveryCost,
                c.return_hotel AS returnHotel,
                c.return_room AS returnRoom,
                c.return_cost AS returnCost,
                c.start_mileage AS startMileage,
                c.end_mileage AS endMileage,
                c.fuel_level AS fuelLevel,
                c.cleanliness,
                c.status,
                c.photos,
                c.notes,
                c.created_at AS createdAt,
                cc.id AS carId,
                cc.license_plate AS carLicensePlate,
                cc.year AS carYear,
                cc.transmission AS carTransmission,
                cc.photos AS carPhotos,
                cb.name AS brandName,
                cm.name AS modelName,
                cl.name AS colorName,
                d_pick.name AS pickupDistrictName,
                d_ret.name AS returnDistrictName
            FROM contracts c
            JOIN company_cars cc ON cc.id = c.company_car_id
            LEFT JOIN car_templates ct ON ct.id = cc.template_id
            LEFT JOIN car_brands cb ON cb.id = ct.brand_id
            LEFT JOIN car_models cm ON cm.id = ct.model_id
            LEFT JOIN colors cl ON cl.id = cc.color_id
            LEFT JOIN districts d_pick ON d_pick.id = c.pickup_district_id
            LEFT JOIN districts d_ret ON d_ret.id = c.return_district_id
            WHERE c.id = ? AND c.client_id = ?
            LIMIT 1
        `)
        .bind(Number(id), user.id)
        .first<any>();

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    // Get payments for this contract
    const paymentsResult = await context.cloudflare.env.DB
        .prepare(`
            SELECT
                p.id,
                p.amount,
                p.currency,
                p.payment_method AS paymentMethod,
                p.status,
                p.notes,
                p.created_at AS createdAt,
                pt.name AS paymentTypeName,
                pt.sign AS paymentTypeSign
            FROM payments p
            JOIN payment_types pt ON pt.id = p.payment_type_id
            WHERE p.contract_id = ?
            ORDER BY p.created_at ASC
        `)
        .bind(Number(id))
        .all() as { results?: any[] };
    const payments = paymentsResult.results || [];

    return { contract, payments };
}

export default function ContractDetails() {
    const { contract, payments } = useLoaderData<typeof loader>();

    const carPhotos = contract.carPhotos ? JSON.parse(contract.carPhotos) : [];
    const contractPhotos = contract.photos ? JSON.parse(contract.photos) : [];

    const getStatusVariant = (status: string | null) => {
        switch (status) {
            case "active": return "info";
            case "closed": return "success";
            default: return "neutral";
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <BackButton to="/dashboard/my-bookings" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.id}</h1>
                        <p className="text-sm text-gray-500">
                            Created {format(new Date(contract.createdAt), "MMM dd, yyyy")}
                        </p>
                    </div>
                </div>
                <StatusBadge variant={getStatusVariant(contract.status)}>
                    {contract.status}
                </StatusBadge>
            </div>

            {/* Car Info */}
            <Card padding="lg" className="shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Vehicle Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        {carPhotos.length > 0 && (
                            <img
                                src={carPhotos[0]}
                                alt="Car"
                                className="w-full h-48 object-cover rounded-xl mb-4"
                            />
                        )}
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500">Vehicle</p>
                            <p className="font-semibold">
                                {contract.brandName} {contract.modelName} {contract.carYear}
                            </p>
                            <p className="text-sm text-gray-600">
                                {contract.colorName} • {contract.carTransmission}
                            </p>
                            <p className="text-sm text-gray-600">
                                License Plate: {contract.carLicensePlate}
                            </p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Rental Period</p>
                            <div className="flex items-center gap-2 text-gray-900">
                                <CalendarIcon className="h-5 w-5" />
                                <span>
                                    {format(new Date(contract.startDate), "MMM dd, yyyy")} -{" "}
                                    {format(new Date(contract.endDate), "MMM dd, yyyy")}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
                            <div className="flex items-center gap-2 text-gray-900">
                                <MapPinIcon className="h-5 w-5" />
                                <span>
                                    {contract.pickupHotel || contract.pickupDistrictName}
                                    {contract.pickupRoom && `, Room ${contract.pickupRoom}`}
                                </span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500 mb-1">Return Location</p>
                            <div className="flex items-center gap-2 text-gray-900">
                                <MapPinIcon className="h-5 w-5" />
                                <span>
                                    {contract.returnHotel || contract.returnDistrictName}
                                    {contract.returnRoom && `, Room ${contract.returnRoom}`}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Pricing */}
            <Card padding="lg" className="shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Pricing Details</h2>
                <div className="space-y-3">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount</span>
                        <span className="font-semibold">
                            {contract.totalCurrency} {contract.totalAmount}
                        </span>
                    </div>
                    {contract.depositAmount && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Deposit</span>
                            <span className="font-semibold">
                                {contract.depositCurrency} {contract.depositAmount}
                            </span>
                        </div>
                    )}
                    {contract.fullInsuranceEnabled && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Full Insurance</span>
                            <span className="font-semibold">฿{contract.fullInsurancePrice}</span>
                        </div>
                    )}
                    {contract.babySeatEnabled && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Baby Seat</span>
                            <span className="font-semibold">฿{contract.babySeatPrice}</span>
                        </div>
                    )}
                    {(contract.deliveryCost ?? 0) > 0 && (
                        <div className="flex justify-between">
                            <span className="text-gray-600">Delivery Fee</span>
                            <span className="font-semibold">฿{contract.deliveryCost ?? 0}</span>
                        </div>
                    )}
                </div>
            </Card>

            {/* Payments */}
            <Card padding="lg" className="shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Payment History</h2>
                {payments.length > 0 ? (
                    <div className="space-y-3">
                        {payments.map((payment) => (
                            <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="font-medium">{payment.paymentTypeName}</p>
                                    <p className="text-sm text-gray-500">
                                        {format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`font-semibold ${payment.paymentTypeSign === '+' ? 'text-green-600' : 'text-red-600'}`}>
                                        {payment.paymentTypeSign}{payment.currency} {payment.amount}
                                    </p>
                                    <p className="text-sm text-gray-500">{payment.paymentMethod}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 text-center py-4">No payments recorded</p>
                )}
            </Card>
        </div>
    );
}
