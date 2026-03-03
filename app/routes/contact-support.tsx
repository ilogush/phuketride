import type { Route } from "./+types/home";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Contact Support | Phuket Ride" },
    {
      name: "description",
      content: "Get help from Phuket Ride support team. We're here 24/7 to assist you with any questions."
    },
  ];
}

export async function loader({ context }: Route.LoaderArgs) {
  return {};
}

export default function ContactSupport() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-12">
          <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-6">
            Contact Support
          </h1>

          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-600 mb-8">
              We're here to help. Reach out to our support team anytime, day or night.
            </p>

            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Phone</h3>
                <p className="text-gray-600 mb-2">Call us 24/7</p>
                <p className="text-gray-900 font-semibold">+66 123 456 789</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Email</h3>
                <p className="text-gray-600 mb-2">We'll respond within 24 hours</p>
                <p className="text-gray-900 font-semibold">support@phuketride.com</p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-6 text-center">
                <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Live Chat</h3>
                <p className="text-gray-600 mb-2">Available 24/7</p>
                <button className="text-gray-900 font-semibold hover:underline">Start Chat</button>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4 mb-8">
              <details className="bg-gray-50 rounded-2xl p-6 group">
                <summary className="font-bold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  How do I modify or cancel my booking?
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-gray-600 mt-4">You can modify or cancel your booking from your account dashboard. Cancellation policies vary by host, so please review the terms of your specific booking.</p>
              </details>
              <details className="bg-gray-50 rounded-2xl p-6 group">
                <summary className="font-bold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  What if I have an accident during my rental?
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-gray-600 mt-4">Contact our support team immediately. All rentals include insurance coverage. We'll guide you through the claims process and assist with any necessary arrangements.</p>
              </details>
              <details className="bg-gray-50 rounded-2xl p-6 group">
                <summary className="font-bold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  Can I extend my rental period?
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-gray-600 mt-4">Yes, you can request to extend your rental through your account. The host must approve the extension, and additional charges may apply.</p>
              </details>
              <details className="bg-gray-50 rounded-2xl p-6 group">
                <summary className="font-bold text-gray-900 cursor-pointer list-none flex justify-between items-center">
                  What documents do I need to rent a car?
                  <span className="group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="text-gray-600 mt-4">You'll need a valid driver's license, proof of insurance (if not purchasing our coverage), and a valid payment method. International renters may need an International Driving Permit.</p>
              </details>
            </div>

            <div className="bg-gray-900 rounded-3xl p-8 text-center">
              <h2 className="text-2xl font-bold text-white mb-4">
                Still need help?
              </h2>
              <p className="text-gray-300 mb-6">
                Our support team is available 24/7 to assist you
              </p>
              <button className="bg-white text-gray-900 px-8 py-4 rounded-full font-semibold hover:bg-green-100 transition-colors">
                Contact Us
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
