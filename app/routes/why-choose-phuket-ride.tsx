import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Why Choose Phuket Ride | Phuket Ride" },
    {
      name: "description",
      content: "Discover why Phuket Ride is the preferred choice for car rentals. Best prices, protection, and 24/7 support."
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  return {};
}

export default function WhyChoosePhuketRide() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
            Why choose Phuket Ride?
          </h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              We're reimagining car rental from the ground up to give you the best experience possible.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              The Phuket Ride difference
            </h2>
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Best Price Guarantee</h3>
                <p className="text-gray-600">Find a lower price? We'll match it. Our competitive rates ensure you get the best deal.</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Wide Selection</h3>
                <p className="text-gray-600">Choose from a diverse fleet of vehicles, from economy cars to luxury vehicles.</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-900 mb-2 text-lg">Flexible Booking</h3>
                <p className="text-gray-600">Free cancellation on most bookings. Change or cancel your reservation with ease.</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="font-bold text-gray-900 mb-2 text-lg">24/7 Support</h3>
                <p className="text-gray-600">Our dedicated support team is available around the clock to assist you.</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Protection you can trust
            </h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Comprehensive insurance:</span>
                <span className="text-gray-600">All rentals include liability insurance and physical damage protection</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Verified hosts:</span>
                <span className="text-gray-600">All vehicle owners are verified and reviewed by our team</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Secure payments:</span>
                <span className="text-gray-600">Your payments are protected with industry-leading security</span>
              </li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              What our customers say
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="text-yellow-500 mb-3">★★★★★</div>
                <p className="text-gray-600 mb-4">"Easy booking process and great customer service. Will definitely use again!"</p>
                <p className="text-gray-900 font-semibold">— Sarah M.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="text-yellow-500 mb-3">★★★★★</div>
                <p className="text-gray-600 mb-4">"The car was clean and exactly as described. Highly recommend!"</p>
                <p className="text-gray-900 font-semibold">— James T.</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <div className="text-yellow-500 mb-3">★★★★★</div>
                <p className="text-gray-600 mb-4">"Best prices I found anywhere. The whole experience was seamless."</p>
                <p className="text-gray-900 font-semibold">— Michael R.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
