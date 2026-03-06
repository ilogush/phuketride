import { Link } from "react-router";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 bg-gray-100 border-t border-gray-100 pt-16 pb-12">
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

          <div className="flex gap-5 items-center text-sm">
            <Link to="/contact-support" className="text-gray-400 hover:text-gray-600 transition-colors">Support</Link>
            <Link to="/legal" className="text-gray-400 hover:text-gray-600 transition-colors">Privacy</Link>
            <Link to="/host-tools" className="text-gray-400 hover:text-gray-600 transition-colors">Host tools</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
