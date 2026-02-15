import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Link, Form } from "react-router";
import { useState } from "react";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, desc, isNull } from "drizzle-orm";
import * as schema from "~/db/schema";
import PageHeader from "~/components/dashboard/PageHeader";
import BackButton from "~/components/dashboard/BackButton";
import Card from "~/components/dashboard/Card";
import Button from "~/components/dashboard/Button";
import StatusBadge from "~/components/dashboard/StatusBadge";
import MaintenanceHistory from "~/components/dashboard/MaintenanceHistory";
import { format } from "date-fns";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

export async function loader({ request, params, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const carId = Number(params.id);

    // Get car with relations
    const car = await db.query.companyCars.findFirst({
        where: eq(schema.companyCars.id, carId),
        with: {
            company: true,
            template: {
                with: {
                    brand: true,
                    model: true,
                    bodyType: true,
                    fuelType: true,
                }
            },
            color: true,
            fuelType: true,
        }
    });

    if (!car) {
        throw new Response("Car not found", { status: 404 });
    }

    // Check access for non-admin users
    if (user.role !== "admin" && car.companyId !== user.companyId) {
        throw new Response("Access denied", { status: 403 });
    }

    // Get maintenance history
    const maintenanceHistory = await db.query.maintenanceHistory.findMany({
        where: eq(schema.maintenanceHistory.companyCarId, carId),
        orderBy: [desc(schema.maintenanceHistory.performedAt)],
        limit: 10,
    });

    // Calculate oil change progress
    const oilChangeProgress = car.nextOilChangeMileage && car.mileage
        ? Math.min(100, (car.mileage / car.nextOilChangeMileage) * 100)
        : 0;

    const needsOilChange = oilChangeProgress >= 90;

    return { car, maintenanceHistory, oilChangeProgress, needsOilChange, user };
}

export async function action({ request, context, params }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();
    const intent = formData.get("intent");
    const carId = Number(params.id);

    // Get car to check company_id
    const car = await db.query.companyCars.findFirst({
        where: eq(schema.companyCars.id, carId),
    });

    if (!car) {
        return redirect(`/dashboard/cars?error=Car not found`);
    }

    // Check access
    if (user.role !== "admin" && car.companyId !== user.companyId) {
        return redirect(`/dashboard/cars/${carId}?error=Access denied`);
    }

    if (intent === "archive" || intent === "delete") {
        const { deleteOrArchiveCar } = await import("~/lib/archive.server");
        const result = await deleteOrArchiveCar(context.cloudflare.env.DB, carId, car.companyId);
        
        if (result.success) {
            return redirect(`/dashboard/cars?success=${encodeURIComponent(result.message || "Car updated successfully")}`);
        } else {
            return redirect(`/dashboard/cars/${carId}?error=${encodeURIComponent(result.message || result.error || "Failed to update car")}`);
        }
    }

    if (intent === "unarchive") {
        await db.update(schema.companyCars)
            .set({ archivedAt: null })
            .where(eq(schema.companyCars.id, carId));
        
        return redirect(`/dashboard/cars/${carId}?success=Car unarchived successfully`);
    }

    return redirect(`/dashboard/cars/${carId}`);
}

export default function CarDetailsPage() {
    const { car, maintenanceHistory, oilChangeProgress, needsOilChange, user } = useLoaderData<typeof loader>();
    const [showMaintenance, setShowMaintenance] = useState(false);

    const photos = car.photos ? JSON.parse(car.photos) : [];
    const documentPhotos = car.documentPhotos ? JSON.parse(car.documentPhotos) : [];
    const maintenanceRows = maintenanceHistory.map((r) => ({
        id: r.id,
        maintenance_type: r.maintenanceType,
        description: undefined,
        cost: r.cost !== null && r.cost !== undefined ? String(r.cost) : undefined,
        daily_mileage_limit: undefined,
        mileage: r.mileage ?? undefined,
        performed_at: r.performedAt.toISOString(),
        notes: r.notes ?? undefined,
        next_maintenance_date: undefined,
    }));

    const statusVariant =
        car.status === "available"
            ? "success"
            : car.status === "rented"
                ? "info"
                : car.status === "booked"
                    ? "warning"
                    : car.status === "maintenance"
                        ? "warning"
                        : "neutral";

    return (
        <div className="space-y-6">
            <PageHeader
                title={`${car.template?.brand?.name || ''} ${car.template?.model?.name || ''} ${car.year}`}
                leftActions={<BackButton to="/dashboard/cars" />}
                rightActions={
                    <div className="flex gap-2">
                        {car.archivedAt ? (
                            <Form method="post">
                                <input type="hidden" name="intent" value="unarchive" />
                                <Button type="submit" variant="primary">
                                    Unarchive
                                </Button>
                            </Form>
                        ) : (
                            <>
                                <Link to={`/dashboard/cars/${car.id}/edit`}>
                                    <Button variant="secondary">
                                        Edit
                                    </Button>
                                </Link>
                                <Form method="post">
                                    <input type="hidden" name="intent" value="archive" />
                                    <Button type="submit" variant="secondary">
                                        Archive/Delete
                                    </Button>
                                </Form>
                            </>
                        )}
                    </div>
                }
            />

            {/* Oil Change Warning */}
            {needsOilChange && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0">
                            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-medium text-yellow-800">Oil Change Required Soon</h3>
                            <p className="text-sm text-yellow-700 mt-1">
                                Current mileage: {car.mileage?.toLocaleString()} km • Next service: {car.nextOilChangeMileage?.toLocaleString()} km
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Vehicle Details</h2>
                            <StatusBadge variant={statusVariant}>{car.status || "unknown"}</StatusBadge>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">License Plate</h3>
                                <p className="text-base text-gray-900">{car.licensePlate}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">VIN</h3>
                                <p className="text-base text-gray-900">{car.vin || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Year</h3>
                                <p className="text-base text-gray-900">{car.year}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Color</h3>
                                <p className="text-base text-gray-900">{car.color?.name || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Transmission</h3>
                                <p className="text-base text-gray-900 capitalize">{car.transmission || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Fuel Type</h3>
                                <p className="text-base text-gray-900">{car.fuelType?.name || car.template?.fuelType?.name || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Body Type</h3>
                                <p className="text-base text-gray-900">{car.template?.bodyType?.name || '-'}</p>
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-gray-500">Engine Volume</h3>
                                <p className="text-base text-gray-900">{car.engineVolume || car.template?.engineVolume || '-'} L</p>
                            </div>
                        </div>
                    </Card>

                    {/* Maintenance Section */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900">Maintenance</h2>
                        </div>

                        {/* Oil Change Progress */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium text-gray-700">Oil Change Progress</span>
                                <span className="text-sm text-gray-600">
                                    {car.mileage?.toLocaleString()} / {car.nextOilChangeMileage?.toLocaleString()} km
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                    className={`h-2 rounded-full transition-all ${
                                        oilChangeProgress >= 90 ? 'bg-red-500' : 
                                        oilChangeProgress >= 75 ? 'bg-yellow-500' : 
                                        'bg-green-500'
                                    }`}
                                    style={{ width: `${oilChangeProgress}%` }}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Interval: {car.oilChangeInterval?.toLocaleString()} km
                            </p>
                        </div>

                        {/* Maintenance History Component */}
                        <MaintenanceHistory 
                            carId={car.id} 
                            currentMileage={car.mileage || 0}
                            data={maintenanceRows}
                        />
                    </Card>

                    {/* Photos */}
                    {photos.length > 0 && (
                        <Card>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
                            <div className="grid grid-cols-3 gap-4">
                                {photos.slice(0, 6).map((photo: string, index: number) => (
                                    <img 
                                        key={index}
                                        src={photo} 
                                        alt={`Car photo ${index + 1}`}
                                        className="w-full h-32 object-cover rounded-lg"
                                    />
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Price per Day</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {car.pricePerDay} THB
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-sm text-gray-600">Deposit</span>
                                <span className="text-sm font-medium text-gray-900">
                                    {car.deposit} THB
                                </span>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance</h2>
                        <div className="space-y-3">
                            {car.minInsurancePrice && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Min Insurance</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {car.minInsurancePrice} THB
                                    </span>
                                </div>
                            )}
                            {car.maxInsurancePrice && (
                                <div className="flex justify-between">
                                    <span className="text-sm text-gray-600">Max Insurance</span>
                                    <span className="text-sm font-medium text-gray-900">
                                        {car.maxInsurancePrice} THB
                                    </span>
                                </div>
                            )}
                            {car.insuranceExpiryDate && (
                                <div>
                                    <span className="text-sm text-gray-600">Expires:</span>
                                    <span className="text-sm text-gray-900 ml-2">
                                        {format(new Date(car.insuranceExpiryDate), "MMM dd, yyyy")}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
                        <div className="space-y-2 text-sm">
                            {car.taxRoadExpiryDate && (
                                <div>
                                    <span className="text-gray-600">Tax Road:</span>
                                    <span className="text-gray-900 ml-2">
                                        {format(new Date(car.taxRoadExpiryDate), "MMM dd, yyyy")}
                                    </span>
                                </div>
                            )}
                            {car.registrationExpiry && (
                                <div>
                                    <span className="text-gray-600">Registration:</span>
                                    <span className="text-gray-900 ml-2">
                                        {format(new Date(car.registrationExpiry), "MMM dd, yyyy")}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>

                    {user.role === "admin" && (
                        <Card>
                            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company</h2>
                            <Link to={`/dashboard/companies/${car.companyId}`}>
                                <p className="text-sm text-blue-600 hover:text-blue-700">
                                    {car.company?.name}
                                </p>
                            </Link>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}
