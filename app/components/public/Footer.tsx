export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-white border-t border-gray-200 mt-16">
      <div className="max-w-5xl mx-auto px-4 py-4">
        <div className="text-center text-sm text-gray-500">
          <p>© {currentYear} Phuket Ride. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
