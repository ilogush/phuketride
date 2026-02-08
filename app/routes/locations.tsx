import { type LoaderFunctionArgs } from "react-router";
import { useLoaderData, Link } from "react-router";
import type { Route } from "./+types/locations";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import { MapPinIcon, HomeIcon } from "@heroicons/react/24/outline";
import Button from "~/components/dashboard/Button";

interface District {
    id: number;
    name: string;
    locationId: number;
    beaches: string | null;
    deliveryPrice: number | null;
}

export function meta({}: Route.MetaArgs) {
    return [
        { title: "Phuket Districts & Locations - Car Rental" },
        { name: "description", content: "Explore all districts and beach locations in Phuket where we deliver rental cars" },
    ];
}

export async function loader({ context }: LoaderFunctionArgs) {
    const db = drizzle(context.cloudflare.env.DB, { schema });
    
    const districts = await db
        .select()
        .from(schema.districts)
        .where(eq(schema.districts.locationId, 1))
        .orderBy(schema.districts.name)
        .limit(100);

    return { districts };
}

export default function LocationsPage() {
    const { districts } = useLoaderData<typeof loader>();

    const parseBeaches = (beaches: string | null): string[] => {
        if (!beaches) return [];
        try {
            return JSON.parse(beaches);
        } catch {
            return [];
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2 text-gray-800 hover:text-gray-600">
                            <HomeIcon className="w-5 h-5" />
                            <span className="font-medium">Home</span>
                        </Link>
                        <Link to="/login" className="text-sm text-gray-600 hover:text-gray-800">
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-gray-500 py-16">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Phuket Districts & Locations
                        </h1>
                        <p className="text-xl text-blue-100">
                            We deliver rental cars to all major districts and beaches across Phuket
                        </p>
                    </div>
                </div>
            </div>

            {/* Districts Grid */}
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-6xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {districts.map((district) => {
                            const beaches = parseBeaches(district.beaches);
                            const hasBeaches = beaches.length > 0;

                            return (
                                <div
                                    key={district.id}
                                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden"
                                >
                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                                                <MapPinIcon className="w-6 h-6 text-gray-500" />
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-500">
                                                {district.name}
                                            </h3>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {hasBeaches ? (
                                            <div className="space-y-2">
                                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                                    Beaches & Locations
                                                </p>
                                                <ul className="space-y-2">
                                                    {beaches.map((beach, index) => (
                                                        <li
                                                            key={index}
                                                            className="flex items-start gap-2 text-sm text-gray-700"
                                                        >
                                                            <span className="text-blue-500 mt-1">•</span>
                                                            <span>{beach}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-400 italic">
                                                No specific locations listed
                                            </p>
                                        )}

                                        {district.deliveryPrice !== null && district.deliveryPrice > 0 && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-gray-500">Delivery Fee</span>
                                                    <span className="text-lg font-bold text-blue-600">
                                                        ฿{district.deliveryPrice}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Footer CTA */}
            <div className="bg-gray-800 text-gray-500 py-12">
                <div className="container mx-auto px-4 text-center">
                    <h2 className="text-2xl font-bold mb-4">Ready to Rent a Car?</h2>
                    <p className="text-gray-300 mb-6">
                        Sign in to browse available cars and make a booking
                    </p>
                    <Link to="/login">
                        <Button size="lg" variant="primary">
                            Get Started
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}
