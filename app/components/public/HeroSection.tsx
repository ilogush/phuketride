import { Link } from "react-router";
import { CheckIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";
import DateRangePicker from "~/components/public/DateRangePicker";

interface HeroSectionProps {
  districts: string[];
}

export default function HeroSection({ districts }: HeroSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showLocations, setShowLocations] = useState(false);
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
    <section className="relative z-30 pb-8">
      <div className="relative overflow-visible rounded-2xl border border-gray-200 bg-white min-h-[300px] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: "url('/logo.webp')" }}
        />
        <div className="relative z-50 w-full max-w-5xl text-center px-4 py-6">
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-800">
            Skip the rental car counter
          </h1>
          <p className="mt-2 text-base text-gray-500">
            Rent just about any car, just about anywhere
          </p>

          <div className="relative mt-6">
            <div className="bg-white rounded-xl border border-gray-200 flex flex-col md:flex-row items-stretch text-gray-800 p-2 gap-3">
              <div className="flex-1 relative md:border-r border-gray-200 md:pr-3">
                <label className="block mb-2 text-left">
                  <p className="text-xs font-semibold text-gray-500 text-left">Where</p>
                </label>
                <input
                  type="text"
                  placeholder="City, airport, address or hotel"
                  className="w-full text-sm bg-transparent border-none outline-none focus:bg-gray-50 transition-colors text-left"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedDistrict("");
                    setShowLocations(true);
                  }}
                  onFocus={() => setShowLocations(true)}
                />

                {showLocations && (
                  <div className="absolute left-[-0.5rem] top-full mt-2 w-[calc(100%+0.5rem)] min-w-[320px] max-w-[520px] bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[60] max-h-[420px] overflow-y-scroll overscroll-contain scroll-smooth">
                    {filteredDistricts.length > 0 ? (
                      filteredDistricts.map((district) => (
                        <button
                          key={district}
                          type="button"
                          onClick={() => handleLocationSelect(district)}
                          aria-selected={selectedDistrict === district}
                          className={`w-full px-4 py-3 text-left transition-colors text-base flex items-center justify-between ${selectedDistrict === district ? "bg-indigo-50 text-indigo-700" : "text-gray-800 hover:bg-gray-50"}`}
                        >
                          <span>{district}</span>
                          {selectedDistrict === district && <CheckIcon className="h-4 w-4" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-sm text-gray-500">No districts found</div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex-1 border-r border-gray-200 pr-3">
                <DateRangePicker compact />
              </div>

              <Link
                className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 py-3 flex items-center justify-center rounded-xl"
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
