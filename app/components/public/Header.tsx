import { Link, Form } from "react-router";
import { GlobeAltIcon, Bars3Icon, UserIcon, ArrowRightOnRectangleIcon, TruckIcon, KeyIcon, GiftIcon, PhoneIcon, DocumentTextIcon, ShieldCheckIcon, WrenchScrewdriverIcon, CalculatorIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export default function Header() {
  const [isLanguageOpen, setIsLanguageOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <Link className="flex items-center" to="/">
            <img src="/logo.png" alt="P" className="w-10 h-10 object-contain -mr-2" />
            <div className="font-black text-2xl tracking-tight text-gray-900 leading-none">huket Ride</div>
          </Link>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 rounded-full text-sm font-medium hidden md:block hover:bg-green-100 transition-colors">
              Why choose Phuket Ride ?
            </button>

            {/* Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsLanguageOpen(!isLanguageOpen)}
                className="p-2 rounded-full hover:bg-green-100 transition-colors flex items-center justify-center"
              >
                <GlobeAltIcon className="w-6 h-6" />
              </button>
              {isLanguageOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <button className="w-full px-4 py-2 text-left hover:bg-green-100 transition-colors">
                    English
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-green-100 transition-colors">
                    ไทย (Thai)
                  </button>
                  <button className="w-full px-4 py-2 text-left hover:bg-green-100 transition-colors">
                    Russian
                  </button>
                </div>
              )}
            </div>

            {/* Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full hover:bg-green-100 transition-colors flex items-center justify-center"
              >
                <Bars3Icon className="w-6 h-6" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <Link
                    to="/login"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <UserIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Login</span>
                  </Link>
                  <Form method="post" action="/logout">
                    <button
                      type="submit"
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors text-left"
                    >
                      <ArrowRightOnRectangleIcon className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium text-gray-800">Log out</span>
                    </button>
                  </Form>

                  <div className="border-t border-gray-200 my-2"></div>

                  <Link
                    to="/become-a-host"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <TruckIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Become a host</span>
                  </Link>
                  <Link
                    to="/why-choose-phuket-ride"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <KeyIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Why choose Phuket Ride ?</span>
                  </Link>
                  <Link
                    to="/gift-cards"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <GiftIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Gift cards</span>
                  </Link>
                  <Link
                    to="/contact-support"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <PhoneIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Contact support</span>
                  </Link>
                  <Link
                    to="/legal"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <DocumentTextIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Legal</span>
                  </Link>
                  <Link
                    to="/insurance-protection"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <ShieldCheckIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Insurance & protection</span>
                  </Link>
                  <Link
                    to="/host-tools"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <WrenchScrewdriverIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Host tools</span>
                  </Link>
                  <Link
                    to="/carculator"
                    className="flex items-center gap-3 px-4 py-3 hover:bg-green-100 transition-colors"
                  >
                    <CalculatorIcon className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-medium text-gray-800">Carculator</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay to close dropdowns when clicking outside */}
      {(isLanguageOpen || isMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsLanguageOpen(false);
            setIsMenuOpen(false);
          }}
        />
      )}
    </header>
  );
}
