import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Become a Host | Phuket Ride" },
    {
      name: "description",
      content: "Earn money by renting out your car with Phuket Ride. Join our community of hosts and start earning today."
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  return {};
}

export default function BecomeAHost() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
            Become a Host
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              Earn extra income by sharing your car with renters in your area. Join thousands of hosts who are already earning with Phuket Ride.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Why become a host?
            </h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Earn money:</span>
                <span className="text-gray-600">Set your own prices and earn up to 65% of your booking total</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">You're in control:</span>
                <span className="text-gray-600">Choose who rents your car and when it's available</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Protection included:</span>
                <span className="text-gray-600">All bookings include liability insurance and physical damage protection</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Support 24/7:</span>
                <span className="text-gray-600">Our dedicated support team is here to help whenever you need it</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              How it works
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="text-3xl font-black text-gray-900 mb-2">1</div>
                <h3 className="font-bold text-gray-900 mb-2">List your car</h3>
                <p className="text-gray-600">Create a free listing with photos and set your availability</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="text-3xl font-black text-gray-900 mb-2">2</div>
                <h3 className="font-bold text-gray-900 mb-2">Accept bookings</h3>
                <p className="text-gray-600">Review renter requests and accept bookings that work for you</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6">
                <div className="text-3xl font-black text-gray-900 mb-2">3</div>
                <h3 className="font-bold text-gray-900 mb-2">Start earning</h3>
                <p className="text-gray-600">Hand over your keys and get paid directly to your bank account</p>
              </div>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 mt-12 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Ready to start earning?
              </h2>
              <p className="text-gray-300 mb-6">
                Join Phuket Ride today and become part of our growing community of hosts
              </p>
              <button className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-indigo-100 transition-colors">
                List your car
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
