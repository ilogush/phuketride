import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Insurance & Protection | Phuket Ride" },
    {
      name: "description",
      content: "Comprehensive insurance and protection coverage for all Phuket Ride rentals. Drive with confidence."
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  return {};
}

export default function InsuranceProtection() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
            Insurance & Protection
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              Every booking on Phuket Ride includes comprehensive insurance coverage. Drive with confidence knowing you're protected.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              What's included
            </h2>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-3 text-lg">Liability Insurance</h3>
                <p className="text-gray-600 mb-4">Coverage for bodily injury and property damage to third parties up to ฿1,000,000 per incident.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Bodily injury coverage</li>
                  <li>✓ Property damage coverage</li>
                  <li>✓ Legal defense costs</li>
                </ul>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-3 text-lg">Physical Damage Protection</h3>
                <p className="text-gray-600 mb-4">Protection against damage to the rental vehicle with customizable deductible options.</p>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>✓ Collision damage waiver</li>
                  <li>✓ Theft protection</li>
                  <li>✓ Vandalism coverage</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Protection plans
            </h2>
            <div className="space-y-6 mb-8">
              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Basic Protection</h3>
                    <p className="text-gray-600 text-sm">Included with every booking</p>
                  </div>
                  <span className="bg-gray-900 text-white px-4 py-2 rounded-full text-sm font-semibold">Included</span>
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li>• Liability coverage up to ฿1,000,000</li>
                  <li>• Physical damage with ฿25,000 deductible</li>
                  <li>✓ Roadside assistance</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Standard Protection</h3>
                    <p className="text-gray-600 text-sm">Reduced deductible</p>
                  </div>
                  <span className="bg-gray-100 text-gray-900 px-4 py-2 rounded-full text-sm font-semibold">+฿500/day</span>
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li>• Everything in Basic</li>
                  <li>• Reduced deductible to ฿10,000</li>
                  <li>✓ Priority support</li>
                </ul>
              </div>

              <div className="border border-gray-200 rounded-2xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Premium Protection</h3>
                    <p className="text-gray-600 text-sm">Maximum coverage</p>
                  </div>
                  <span className="bg-gray-100 text-gray-900 px-4 py-2 rounded-full text-sm font-semibold">+฿1,000/day</span>
                </div>
                <ul className="space-y-2 text-gray-600">
                  <li>• Everything in Standard</li>
                  <li>• Zero deductible</li>
                  <li>✓ Windshield and tire coverage</li>
                  <li>✓ Personal accident insurance</li>
                </ul>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              What's not covered
            </h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-8">
              <ul className="space-y-2 text-gray-700">
                <li>• Damage caused by driving under the influence of alcohol or drugs</li>
                <li>• Damage from off-road driving or racing</li>
                <li>• Loss of personal belongings left in the vehicle</li>
                <li>• Damage caused by unauthorized drivers</li>
                <li>• Traffic fines and toll violations</li>
                <li>• Normal wear and tear</li>
              </ul>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              In case of an accident
            </h2>
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-gray-900 mb-2">1</div>
                <p className="text-gray-600 text-sm">Ensure everyone's safety and call emergency services if needed</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-gray-900 mb-2">2</div>
                <p className="text-gray-600 text-sm">Document the scene with photos and gather witness information</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-gray-900 mb-2">3</div>
                <p className="text-gray-600 text-sm">Contact Phuket Ride support immediately</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-3xl font-black text-gray-900 mb-2">4</div>
                <p className="text-gray-600 text-sm">File a police report if required</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Questions about coverage?
              </h2>
              <p className="text-gray-300 mb-6">
                Our team can help you understand your protection options
              </p>
              <a href="/contact-support" className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-green-100 transition-colors inline-block">
                Contact Support
              </a>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
