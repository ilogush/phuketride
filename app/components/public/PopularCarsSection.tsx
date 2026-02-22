import { useState } from "react";
import { Link } from "react-router";
import Button from "~/components/public/Button";
import ClientButton from "~/components/public/ClientButton";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

interface PublicCarItem {
  id: number;
  brandName: string;
  modelName: string;
  year: number | null;
  bodyType: string;
  transmission: string | null;
  fuelType: string | null;
  pricePerDay: number;
  deposit: number;
  photoUrl: string | null;
  districtTitle: string;
  officeAddress: string;
  rating: number | null;
  totalRatings: number | null;
}

interface PopularCarsSectionProps {
  cars: PublicCarItem[];
}

const formatMoney = (value: number) => `฿${Math.round(value).toLocaleString()}`;

export default function PopularCarsSection({ cars }: PopularCarsSectionProps) {
  const [pageByDistrict, setPageByDistrict] = useState<Record<string, number>>({});
  const pageSize = 4;

  const grouped = cars.reduce<Record<string, PublicCarItem[]>>((acc, car) => {
    if (!acc[car.districtTitle]) {
      acc[car.districtTitle] = [];
    }
    acc[car.districtTitle].push(car);
    return acc;
  }, {});

  return (
    <div className="py-8">
      {cars.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No cars found</p>
          <p className="text-gray-500 mt-2">Try changing search parameters</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([districtTitle, officeCars]) => {
            const maxPage = Math.max(0, Math.ceil(officeCars.length / pageSize) - 1);
            const currentPage = Math.min(pageByDistrict[districtTitle] || 0, maxPage);
            const visibleCars = officeCars.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

            return (
            <section key={districtTitle} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">{districtTitle}</h2>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    disabled={currentPage <= 0}
                    onClick={() =>
                      setPageByDistrict((prev) => ({
                        ...prev,
                        [districtTitle]: Math.max(0, currentPage - 1),
                      }))
                    }
                    className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    type="button"
                    disabled={currentPage >= maxPage}
                    onClick={() =>
                      setPageByDistrict((prev) => ({
                        ...prev,
                        [districtTitle]: Math.min(maxPage, currentPage + 1),
                      }))
                    }
                    className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-800 hover:bg-gray-100 disabled:opacity-40"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {visibleCars.map((car) => (
                  <article key={car.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <Link to={`/cars/${car.id}`} className="block aspect-[16/10] bg-gray-100">
                      {car.photoUrl ? (
                        <img
                          src={car.photoUrl}
                          alt={`${car.brandName} ${car.modelName}`}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                          No photo
                        </div>
                      )}
                    </Link>

                    <div className="px-3 pt-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-gray-800">
                          {car.brandName} {car.modelName}
                        </h3>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          {car.year || "Year N/A"} • {car.rating?.toFixed(2) || "N/A"}{" "}
                          <StarIcon className="inline w-4 h-4 pb-1 text-indigo-600 align-middle" />{" "}
                          ({car.totalRatings || 0})
                        </p>
                        <p className="text-base font-semibold text-gray-800">
                          {formatMoney(car.pricePerDay)}
                          <span className="ml-1 text-sm font-normal text-gray-500">/day</span>
                        </p>
                      </div>

                      <Link to={`/cars/${car.id}`} className="block sm:hidden mb-3">
                        <ClientButton type="button" className="w-full text-sm">
                          Book now
                        </ClientButton>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )})}
        </div>
      )}
    </div>
  );
}
