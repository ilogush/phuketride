import { Link } from "react-router";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-gray-100 pt-16 pb-12 mt-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Column */}
          <div className="col-span-2 md:col-span-1">
            <Link className="flex items-center mb-6" to="/">
              <img src="/logo.png" alt="P" className="w-8 h-8 object-contain -mr-1.5" />
              <div className="font-black text-xl tracking-tight text-gray-900 leading-none">huket Ride</div>
            </Link>
            <p className="text-gray-500 text-sm leading-relaxed max-w-xs">
              Experience the freedom of Phuket with the island's most trusted car sharing marketplace.
            </p>
          </div>

          {/* Phuket Ride Column */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-xs">Phuket Ride</h3>
            <ul className="space-y-4">
              <li><Link to="/why-choose-phuket-ride" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Why choose us?</Link></li>
              <li><Link to="/carculator" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Carculator</Link></li>
              <li><Link to="/gift-cards" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Gift cards</Link></li>
            </ul>
          </div>

          {/* Hosting Column */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-xs">Hosting</h3>
            <ul className="space-y-4">
              <li><Link to="/become-a-host" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Become a host</Link></li>
              <li><Link to="/host-tools" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Host tools</Link></li>
              <li><Link to="/insurance-protection" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Insurance & protection</Link></li>
            </ul>
          </div>

          {/* Support Column */}
          <div>
            <h3 className="font-bold text-gray-900 mb-6 uppercase tracking-wider text-xs">Support</h3>
            <ul className="space-y-4">
              <li><Link to="/contact-support" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Contact support</Link></li>
              <li><Link to="/legal" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Legal & Terms</Link></li>
              <li><Link to="/home" className="text-gray-600 hover:text-green-600 text-sm transition-colors">Login / Dashboard</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Area */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <span className="text-gray-400 text-sm">© {currentYear} Phuket Ride, Inc.</span>
            <div className="hidden md:flex items-center gap-4">
              <Link to="/legal" className="text-gray-400 hover:text-gray-600 text-xs">Terms</Link>
              <Link to="/legal" className="text-gray-400 hover:text-gray-600 text-xs">Privacy</Link>
              <Link to="/legal" className="text-gray-400 hover:text-gray-600 text-xs">Sitemap</Link>
            </div>
          </div>

          <div className="flex gap-5 items-center">
            {/* Social Icons placeholder/simulated SVG */}
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
              <span className="sr-only">Facebook</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" /></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
              <span className="sr-only">Instagram</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.332 3.608 1.308.975.975 1.245 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.332 2.633-1.308 3.608-.975.975-2.242 1.245-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.332-3.608-1.308-.975-.975-1.245-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.332-2.633 1.308-3.608.975-.975 2.242-1.245 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zM12 0C8.741 0 8.333.014 7.052.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.355 2.618 6.778 6.98 6.98 1.28.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.668-.072-4.948-.197-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" /></svg>
            </a>
            <a href="#" className="text-gray-400 hover:text-gray-600 transition-colors">
              <span className="sr-only">Twitter</span>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.84 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" /></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
