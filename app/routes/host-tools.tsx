import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Host Tools | Phuket Ride" },
        {
            name: "description",
            content: "Powerful tools for Phuket Ride hosts to manage their business, track performance, and optimize earnings."
        },
    ];
}

export async function loader({ context }: Route.LoaderArgs) {
    return {};
}

export default function HostTools() {
    return (
        <div className="min-h-screen">
            <Header />
            <main className="flex-1">
                <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
                        Host tools
                    </h1>

                    <div className="prose prose-lg max-w-none">
                        <p className="text-xl text-gray-600 mb-8">
                            Everything you need to run a successful hosting business on Phuket Ride. Manage your fleet with precision and maximize your earnings.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
                            Built for your success
                        </h2>
                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-gray-50 rounded-2xl p-6">
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Smart Pricing</h3>
                                <p className="text-gray-600">Our dynamic pricing algorithm adjusts your rates based on demand, local events, and seasonality to maximize your revenue.</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-6">
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Performance Analytics</h3>
                                <p className="text-gray-600">Track your earnings, utilization rates, and customer reviews through our comprehensive host dashboard.</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-6">
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Calendar Management</h3>
                                <p className="text-gray-600">Easily manage your vehicle's availability. Sync with other calendars to prevent double bookings.</p>
                            </div>
                            <div className="bg-gray-50 rounded-2xl p-6">
                                <h3 className="font-bold text-gray-900 mb-2 text-lg">Automated Communication</h3>
                                <p className="text-gray-600">Save time with automated check-in instructions and follow-up messages for your guests.</p>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
                            Host resources
                        </h2>
                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:bg-green-100 transition-colors">
                                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 text-white">1</div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Host Handbook</h3>
                                    <p className="text-gray-600 text-sm">A comprehensive guide to becoming a top-rated host on Phuket Ride.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:bg-green-100 transition-colors">
                                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 text-white">2</div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Photography Guide</h3>
                                    <p className="text-gray-600 text-sm">Learn how to take stunning photos that make your car stand out in search results.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 border border-gray-100 rounded-xl hover:bg-green-100 transition-colors">
                                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center flex-shrink-0 text-white">3</div>
                                <div>
                                    <h3 className="font-bold text-gray-900">Cleaning & Safety Standards</h3>
                                    <p className="text-gray-600 text-sm">Best practices for maintaining your vehicle and ensuring guest satisfaction.</p>
                                </div>
                            </li>
                        </ul>

                        <div className="bg-gray-900 rounded-3xl p-8 mt-12 text-center">
                            <h2 className="text-2xl font-bold text-white mb-4">
                                Join our host community
                            </h2>
                            <p className="text-gray-300 mb-6">
                                Connect with other hosts, share tips, and grow your business together.
                            </p>
                            <button className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-green-100 transition-colors">
                                Access Host Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
