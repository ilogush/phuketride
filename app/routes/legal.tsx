import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Legal | Phuket Ride" },
    {
      name: "description",
      content: "Legal information, terms of service, and privacy policy for Phuket Ride car rental."
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  return {};
}

export default function Legal() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
            Legal
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              Important legal information, terms of service, and policies that govern your use of Phuket Ride.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Terms of Service
            </h2>
            <p className="text-gray-600 mb-4">
              By using Phuket Ride's services, you agree to be bound by our Terms of Service. These terms outline the rules and regulations for the use of our platform.
            </p>
            <ul className="space-y-2 text-gray-600 mb-8">
              <li>• Last updated: January 2025</li>
              <li>• Applies to all users (renters and hosts)</li>
              <li>• Governs use of website and mobile applications</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Privacy Policy
            </h2>
            <p className="text-gray-600 mb-4">
              We respect your privacy and are committed to protecting your personal information. Our Privacy Policy explains how we collect, use, and safeguard your data.
            </p>
            <ul className="space-y-2 text-gray-600 mb-8">
              <li>• Information we collect</li>
              <li>• How we use your information</li>
              <li>• Data sharing and disclosure</li>
              <li>• Your privacy rights</li>
              <li>• Cookie policy</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Rental Agreement
            </h2>
            <p className="text-gray-600 mb-4">
              Each rental transaction is governed by a Rental Agreement between the renter and the vehicle host. Key terms include:
            </p>
            <ul className="space-y-2 text-gray-600 mb-8">
              <li>• Vehicle condition and return requirements</li>
              <li>• Fuel policy and mileage limits</li>
              <li>• Prohibited uses of the vehicle</li>
              <li>• Liability and insurance coverage</li>
              <li>• Damage and accident procedures</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Cancellation Policy
            </h2>
            <p className="text-gray-600 mb-4">
              Cancellation terms vary by booking. Hosts can choose from several cancellation policy options:
            </p>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">Flexible</h3>
                <p className="text-gray-600 text-sm">Full refund up to 24 hours before pickup</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">Moderate</h3>
                <p className="text-gray-600 text-sm">Full refund up to 72 hours before pickup</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6">
                <h3 className="font-bold text-gray-900 mb-2">Strict</h3>
                <p className="text-gray-600 text-sm">50% refund up to 7 days before pickup</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Community Guidelines
            </h2>
            <p className="text-gray-600 mb-4">
              Phuket Ride is a community marketplace. We expect all members to:
            </p>
            <ul className="space-y-2 text-gray-600 mb-8">
              <li>• Treat each other with respect</li>
              <li>• Be honest and transparent</li>
              <li>• Follow all applicable laws and regulations</li>
              <li>• Maintain vehicles in safe condition (hosts)</li>
              <li>• Return vehicles in the same condition (renters)</li>
            </ul>

            <div className="bg-gray-50 rounded-2xl p-6 mb-8">
              <h3 className="font-bold text-gray-900 mb-4">Legal Documents</h3>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-900 font-semibold hover:underline">
                    Full Terms of Service →
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-900 font-semibold hover:underline">
                    Complete Privacy Policy →
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-900 font-semibold hover:underline">
                    Rental Agreement Template →
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-900 font-semibold hover:underline">
                    Insurance Policy Details →
                  </a>
                </li>
              </ul>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Questions about our legal terms?
              </h2>
              <p className="text-gray-300 mb-6">
                Our team is here to help clarify any legal questions you may have
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
