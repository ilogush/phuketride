import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and } from "drizzle-orm";
import * as schema from "~/db/schema";
import { ArrowLeftIcon, CalendarIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import BackButton from "~/components/dashboard/BackButton";
import Card from "~/components/dashboard/Card";
import StatusBadge from "~/components/dashboard/StatusBadge";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const { id } = params;

    if (!id) {
        throw new Response("Contract ID is required", { status: 400 });
    }

    // Get contract with car details
    const [contract] = await db
        .select({
            id: schema.contracts.id,
            startDate: schema.contracts.startDate,
            endDate: schema.contracts.endDate,
            actualEndDate: schema.contracts.actualEndDate,
            totalAmount: schema.contracts.totalAmount,
            totalCurrency: schema.contracts.totalCurrency,
            depositAmount: schema.contracts.depositAmount,
            depositCurrency: schema.contracts.depositCurrency,
            depositPaymentMethod: schema.contracts.depositPaymentMethod,
            fullInsuranceEnabled: schema.contracts.fullInsuranceEnabled,
            fullInsurancePrice: schema.contracts.fullInsurancePrice,
            babySeatEnabled: schema.contracts.babySeatEnabled,
            babySeatPrice: schema.contracts.babySeatPrice,
            islandTripEnabled: schema.contracts.islandTripEnabled,
            islandTripPrice: schema.contracts.islandTripPrice,
            krabiTripEnabled: schema.contracts.krabiTripEnabled,
            krabiTripPrice: schema.contracts.krabiTripPrice,
            pickupHotel: schema.contracts.pickupHotel,
            pickupRoom: schema.contracts.pickupRoom,
            deliveryCost: schema.contracts.deliveryCost,
            returnHotel: schema.contracts.returnHotel,
            returnRoom: schema.contracts.returnRoom,
            returnCost: schema.contracts.returnCost,
            startMileage: schema.contracts.startMileage,
            endMileage: schema.contracts.endMileage,
            fuelLevel: schema.contracts.fuelLevel,
            cleanliness: schema.contracts.cleanliness,
            status: schema.contracts.status,
            photos: schema.contracts.photos,
            notes: schema.contracts.notes,
            createdAt: schema.contracts.createdAt,
            carId: schema.companyCars.id,
            carLicensePlate: schema.companyCars.licensePlate,
            carYear: schema.companyCars.year,
            carTransmission: schema.companyCars.transmission,
            carPhotos: schema.companyCars.photos,
            brandName: schema.carBrands.name,
            modelName: schema.carModels.name,
            colorName: schema.colors.name,
            pickupDistrictName: schema.districts.name,
            returnDistrictName: schema.districts.name,
        })
        .from(schema.contracts)
        .innerJoin(schema.companyCars, eq(schema.contracts.companyCarId, schema.companyCars.id))
        .leftJoin(schema.carTemplates, eq(schema.companyCars.templateId, schema.carTemplates.id))
        .leftJoin(schema.carBrands, eq(schema.carTemplates.brandId, schema.carBrands.id))
        .leftJoin(schema.carModels, eq(schema.carTemplates.modelId, schema.carModels.id))
        .leftJoin(schema.colors, eq(schema.companyCars.colorId, schema.colors.id))
        .leftJoin(schema.districts, eq(schema.contracts.pickupDistrictId, schema.districts.id))
        .where(
            and(
                eq(schema.contracts.id, Number(id)),
                eq(schema.contracts.clientId, user.id)
            )
        )
        .limit(1);

    if (!contract) {
        throw new Response("Contract not found", { status: 404 });
    }

    // Get payments for this contract
    const payments = await db
        .select({
            id: schema.payments.id,
            amount: schema.payments.amount,
            currency: schema.payments.currency,
            paymentMethod: schema.payments.paymentMethod,
            status: schema.payments.status,
            notes: schema.payments.notes,
            createdAt: schema.payments.createdAt,
            paymentTypeName: schema.paymentTypes.name,
            paymentTypeSign: schema.paymentTypes.sign,
        })
        .from(schema.payments)
        .innerJoin(schema.paymentTypes, eq(schema.payments.paymentTypeId, schema.paymentTypes.id))
        .where(eq(schema.payments.contractId, Number(id)))
        .orderBy(schema.payments.createdAt);

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
