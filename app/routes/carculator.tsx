import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import { useState } from "react";

export function meta({ }: Route.MetaArgs) {
    return [
        { title: "Carculator | Phuket Ride" },
        {
            name: "description",
            content: "Calculate your potential earnings as a Phuket Ride host with our carculator tool. See how much you could earn."
        },
    ];
}

export async function loader({ context }: Route.LoaderArgs) {
    return {};
}

export default function Carculator() {
    const [carValue, setCarValue] = useState(500000);
    const [daysPerMonth, setDaysPerMonth] = useState(15);

    const dailyRate = Math.round(carValue * 0.002);
    const monthlyEarnings = dailyRate * daysPerMonth;
    const annualEarnings = monthlyEarnings * 12;

    return (
        <div className="min-h-screen">
            <Header />
            <main className="flex-1">
                <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
                        Carculator
                    </h1>

                    <div className="prose prose-lg max-w-none">
                        <p className="text-xl text-gray-600 mb-8">
                            Curious about how much you could earn by hosting your car? Use our "Carculator" to estimate your potential income.
                        </p>

                        <div className="grid md:grid-cols-2 gap-12 items-start mt-12">
                            <div className="bg-gray-50 rounded-[32px] p-8 space-y-8">
                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
                                        Vehicle Market Value: ฿{carValue.toLocaleString()}
                                    </label>
                                    <input
                                        type="range"
                                        min="100000"
                                        max="5000000"
                                        step="50000"
                                        value={carValue}
                                        onChange={(e) => setCarValue(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>฿100k</span>
                                        <span>฿5M+</span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">
                                        Monthly Rental Days: {daysPerMonth} Days
                                    </label>
                                    <input
                                        type="range"
                                        min="1"
                                        max="31"
                                        step="1"
                                        value={daysPerMonth}
                                        onChange={(e) => setDaysPerMonth(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-gray-900"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>1 day</span>
                                        <span>Full month</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-gray-900 rounded-[32px] p-8 space-y-6 flex flex-col justify-center">
                                <div className="text-center">
                                    <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-1">Estimated Monthly Income</div>
                                    <div className="text-6xl font-black text-gray-900 leading-none tracking-tight">
                                        ฿{monthlyEarnings.toLocaleString()}
                                    </div>
                                </div>

                                <div className="border-t border-gray-100 pt-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-600">Annual potential</span>
                                        <span className="text-gray-900 font-bold">฿{annualEarnings.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Daily average rate</span>
                                        <span className="text-gray-900 font-bold">฿{dailyRate.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="pt-4 text-center">
                                    <p className="text-xs text-gray-400 mb-6 italic leading-relaxed">
                                        *Estimates are based on Phuket Ride average market data and your inputs. Actual results may vary based on location, seasonality, and your car's condition.
                                    </p>
                                    <a href="/become-a-host" className="inline-block w-full bg-gray-900 text-white px-8 py-4 rounded-full font-bold hover:bg-black transition-colors">
                                        Start Hosting Your Car
                                    </a>
                                </div>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mt-16 mb-6">
                            Maximize your car's value
                        </h2>
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-gray-900 mb-3 text-lg">Keep it clean</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Regular cleaning and maintenance result in better reviews and higher daily rates.</p>
                            </div>
                            <div className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-gray-900 mb-3 text-lg">Be responsive</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Quickly responding to booking requests increases your car's visibility in search results.</p>
                            </div>
                            <div className="p-6 border border-gray-100 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-gray-900 mb-3 text-lg">Detailed description</h3>
                                <p className="text-gray-600 text-sm leading-relaxed">Mention all unique features of your vehicle to attract more specialized rental requests.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
}
