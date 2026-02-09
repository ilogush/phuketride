import { Link } from "react-router";
import { MagnifyingGlassIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import { MapPinIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showLocations, setShowLocations] = useState(false);

  const locations = {
    current: "Current location",
    anywhere: "Anywhere",
    airports: [
      "SJC - San Jose Norman Mineta Airport",
      "LAX - Los Angeles International Airport",
      "SFO - San Francisco International Airport",
    ],
    cities: [
      "Los Angeles",
      "San Francisco",
      "San Diego",
      "Phuket",
      "Bangkok",
    ],
    hotels: [
      "Sheraton Grand, Los Angeles",
      "Hilton Phuket Arcadia",
      "Marriott Bangkok",
    ],
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowLocations(true);
  };

  const handleLocationSelect = (location: string) => {
    setSearchQuery(location);
    setShowLocations(false);
  };

  return (
    <section className="pb-8">
      <div 
        className="relative rounded-2xl overflow-hidden min-h-[420px] flex items-center justify-center"
        style={{
          backgroundImage: "url(https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2)",
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-black/30 z-0"></div>
        <div className="relative z-10 w-full max-w-5xl text-center text-white px-4 py-8">
          <h1 className="text-4xl md:text-5xl font-serif font-semibold">
            Skip the rental car counter
          </h1>
          <p className="mt-3 text-lg">
            Rent just about any car, just about anywhere
          </p>
          
          <div className="relative mt-8">
            <div className="bg-white rounded-xl shadow-xl flex flex-col md:flex-row items-stretch text-gray-900 p-2 gap-3">
              <div className="flex-1 relative border-r border-gray-200 pr-3">
                <label className="block mb-2 text-left">
                  <p className="text-xs font-semibold text-gray-500 text-left">Where</p>
                </label>
                <input
                  type="text"
                  placeholder="City, airport, address or hotel"
                  className="w-full text-sm bg-transparent border-none outline-none focus:bg-gray-50 transition-colors text-left"
                  value={searchQuery}
                  onChange={handleInputChange}
                  onFocus={() => setShowLocations(true)}
                />
                
                {/* Location Dropdown */}
                {showLocations && (
                  <div className="absolute left-0 top-full mt-2 w-[450px] bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 max-h-[400px] overflow-y-auto">
                    {/* Current Location */}
                    <button
                      onClick={() => handleLocationSelect(locations.current)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <MapPinIcon className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-900">{locations.current}</span>
                    </button>
                    
                    {/* Anywhere */}
                    <button
                      onClick={() => handleLocationSelect(locations.anywhere)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
                    >
                      <GlobeAltIcon className="w-5 h-5 text-indigo-600" />
                      <div>
                        <div className="text-sm font-medium text-indigo-600">{locations.anywhere}</div>
                        <div className="text-xs text-gray-500">Browse all cars</div>
                      </div>
                    </button>
                    
                    {/* Airports */}
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Airports</p>
                      </div>
                      {locations.airports.map((airport) => (
                        <button
                          key={airport}
                          onClick={() => handleLocationSelect(airport)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-900">{airport}</span>
                        </button>
                      ))}
                    </div>
                    
                    {/* Cities */}
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Cities</p>
                      </div>
                      {locations.cities.map((city) => (
                        <button
                          key={city}
                          onClick={() => handleLocationSelect(city)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-900">{city}</span>
                        </button>
                      ))}
                    </div>
                    
                    {/* Hotels */}
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <div className="px-4 py-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase">Hotels</p>
                      </div>
                      {locations.hotels.map((hotel) => (
                        <button
                          key={hotel}
                          onClick={() => handleLocationSelect(hotel)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-sm text-gray-900">{hotel}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex-1 border-r border-gray-200 pr-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 text-left">From</p>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                    <span>Add dates</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                    <span>Add time</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
              
              <div className="flex-1 border-r border-gray-200 pr-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 text-left">Until</p>
                <div className="flex gap-3">
                  <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                    <span>Add dates</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="flex-1 flex items-center justify-between text-sm text-gray-500 cursor-pointer hover:text-gray-500 transition-colors">
                    <span>Add time</span>
                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </div>
              
              <Link 
                className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-6 flex items-center justify-center rounded-xl" 
                to="/"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Overlay to close dropdown when clicking outside */}
      {showLocations && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowLocations(false)}
        />
      )}
    </section>
  );
}
