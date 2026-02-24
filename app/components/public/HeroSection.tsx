import { Link } from "react-router";
import { CheckIcon, MagnifyingGlassIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import DateRangePicker from "~/components/public/DateRangePicker";

interface HeroSectionProps {
  districts: string[];
}

export default function HeroSection({ districts }: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showLocations, setShowLocations] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const filteredDistricts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return districts;
    }
    return districts.filter((district) => district.toLowerCase().includes(q));
  }, [districts, searchQuery]);

  const handleLocationSelect = (location: string) => {
    setSelectedDistrict(location);
    setSearchQuery(location);
    setShowLocations(false);
  };

  return (
    <section className="relative z-30">
      <div className="relative overflow-visible rounded-3xl border border-gray-200 bg-white min-h-[400px] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center rounded-3xl"
          style={{ backgroundImage: "url('/images/hero-bg.webp')" }}
        />
        <div className="absolute inset-0 rounded-3xl bg-black/20" />
        <div className="relative z-50 w-full max-w-5xl text-center p-6">
          <h1 className="text-3xl md:text-4xl font-semibold text-white drop-shadow-md">
            Car rental in Phuket directly from the owner
          </h1>
          <p className="mt-2 text-2xl text-white drop-shadow-md">
            No middlemen, hidden fees, or overpayments
          </p>

          <div className="relative mt-6">
            <div id="hero-search-shell" className="relative bg-white rounded-xl border border-gray-200 flex flex-col md:flex-row items-stretch text-gray-800 p-2">
              <div className="flex-1 relative md:pr-3">
                <label className="block mb-2 text-left">
                  <p className="text-xs text-gray-500 text-left">Where</p>
                </label>
                <div className="flex items-center gap-2">
                  <MapPinIcon className="h-4 w-4 text-gray-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="City, airport, address or hotel"
                    className="w-full text-base placeholder:text-sm bg-transparent border-none outline-none transition-colors text-left"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setSelectedDistrict("");
                      setShowLocations(true);
                      setDatePickerOpen(false);
                    }}
                    onFocus={() => {
                      setShowLocations(true);
                      setDatePickerOpen(false);
                    }}
                  />
                </div>

                {showLocations && (
                  <div className="absolute left-0 right-0 top-full mt-4 w-auto max-w-none bg-white rounded-lg shadow-xl border border-gray-200  z-[60] max-h-[420px] overflow-y-scroll overscroll-contain scroll-smooth">
                    {filteredDistricts.length > 0 ? (
                      filteredDistricts.map((district) => (
                        <button
                          key={district}
                          type="button"
                          onClick={() => handleLocationSelect(district)}
                          aria-selected={selectedDistrict === district}
                          className={`w-full px-4 py-3 text-left transition-colors text-base flex items-center justify-between ${selectedDistrict === district ? "bg-indigo-50 text-indigo-700" : "text-gray-800 hover:bg-gray-50"}`}
                        >
                          <span className="inline-flex items-center gap-2">
                            <MapPinIcon className="h-4 w-4 shrink-0" />
                            <span>{district}</span>
                          </span>
                          {selectedDistrict === district && <CheckIcon className="h-4 w-4" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">No districts found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 pr-3">
                <DateRangePicker
                  compact
                  dropdownFullWidth
                  portalTargetId="hero-search-shell"
                  compactLabelClassName="text-sm text-gray-500"
                  compactCalendarIconClassName="h-4 w-4"
                  compactShowChevron
                  compactShowTime
                  isOpen={datePickerOpen}
                  onOpenChange={(open) => {
                    setDatePickerOpen(open);
                    if (open) {
                      setShowLocations(false);
                    }
                  }}
                />
              </div>

              <Link
                className="bg-indigo-600 hover:bg-indigo-700 transition text-white p-3 flex items-center justify-center rounded-xl"
                to="/"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showLocations && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowLocations(false)}
        />
      )}
    </section>
  );
}
