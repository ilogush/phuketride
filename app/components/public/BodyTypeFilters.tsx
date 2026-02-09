import { useState } from "react";

const bodyTypes = [
  "All",
  "Sedan",
  "Hatchback",
  "Coupe",
  "Convertible",
  "SUV",
  "Wagon",
  "Van",
  "MPV",
  "Pickup",
  "Station Wagon",
  "Truck",
];

export default function BodyTypeFilters() {
  const [activeType, setActiveType] = useState("All");

  return (
    <section className="-mt-4">
      <div>
        <div className="flex flex-wrap gap-2 items-center">
          {bodyTypes.map((type) => (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeType === type
                  ? "bg-black text-white"
                  : "bg-white text-gray-900 hover:bg-gray-300 border border-gray-200"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
