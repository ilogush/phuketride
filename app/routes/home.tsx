import { Link } from "react-router";
import type { Route } from "./+types/home";
import Button from "~/components/ui/Button";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Car Rental System" },
    { name: "description", content: "Professional car rental management system" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-800 mb-6">
            Car Rental Management System
          </h1>
          <p className="text-xl text-gray-500 mb-8">
            Professional multi-tenant platform for car rental companies
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/login">
              <Button size="lg">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="secondary">Create Account</Button>
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Multi-Company</h3>
            <p className="text-gray-500">Manage multiple rental companies in one platform</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Secure & Reliable</h3>
            <p className="text-gray-500">Enterprise-grade security with role-based access</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Fast & Modern</h3>
            <p className="text-gray-500">Built with latest technologies for best performance</p>
          </div>
        </div>
      </div>
    </div>
  );
}
