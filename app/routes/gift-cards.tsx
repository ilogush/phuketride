import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Gift Cards | Phuket Ride" },
    {
      name: "description",
      content: "Give the gift of travel with Phuket Ride gift cards. Perfect for any occasion."
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  return {};
}

export default function GiftCards() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
            Gift Cards
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              Give the perfect gift – the freedom of the open road. Phuket Ride gift cards can be used for any car rental on our platform.
            </p>

            <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-3xl p-8 mb-8 text-white">
              <h2 className="text-2xl font-bold mb-4">
                Choose your amount
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <button className="bg-white text-gray-900 py-4 rounded-xl font-bold hover:bg-green-100 transition-colors">
                  ฿1,000
                </button>
                <button className="bg-white text-gray-900 py-4 rounded-xl font-bold hover:bg-green-100 transition-colors">
                  ฿2,500
                </button>
                <button className="bg-white text-gray-900 py-4 rounded-xl font-bold hover:bg-green-100 transition-colors">
                  ฿5,000
                </button>
                <button className="bg-white text-gray-900 py-4 rounded-xl font-bold hover:bg-green-100 transition-colors">
                  ฿10,000
                </button>
              </div>
              <p className="text-gray-300 text-sm">
                Gift cards are available in denominations from ฿1,000 to ฿50,000
              </p>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              How gift cards work
            </h2>
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="text-3xl font-black text-gray-900 mb-2">1</div>
                <h3 className="font-bold text-gray-900 mb-2">Purchase</h3>
                <p className="text-gray-600">Choose an amount and complete your purchase instantly</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="text-3xl font-black text-gray-900 mb-2">2</div>
                <h3 className="font-bold text-gray-900 mb-2">Deliver</h3>
                <p className="text-gray-600">Send via email or print at home for physical gifting</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="text-3xl font-black text-gray-900 mb-2">3</div>
                <h3 className="font-bold text-gray-900 mb-2">Redeem</h3>
                <p className="text-gray-600">Recipient can use the code for any booking on Phuket Ride</p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Perfect for any occasion
            </h2>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Birthdays:</span>
                <span className="text-gray-600">Give an experience instead of another gift</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Holidays:</span>
                <span className="text-gray-600">The perfect present for travelers and adventure seekers</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Corporate gifts:</span>
                <span className="text-gray-600">Reward employees or clients with a memorable experience</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gray-900 font-semibold">Just because:</span>
                <span className="text-gray-600">Sometimes the best gifts don't need a special occasion</span>
              </li>
            </ul>

            <div className="bg-gray-50 rounded-2xl p-4 mb-8">
              <h3 className="font-bold text-gray-900 mb-2">Important Information</h3>
              <ul className="space-y-2 text-gray-600">
                <li>• Gift cards are valid for 12 months from date of purchase</li>
                <li>• Cannot be redeemed for cash</li>
                <li>• No expiration fees</li>
                <li>• Lost or stolen cards cannot be replaced</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
