import { useState } from "react";
import { Link } from "react-router";
import Button from "~/components/public/Button";
import ClientButton from "~/components/public/ClientButton";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { StarIcon } from "@heroicons/react/24/solid";

interface PublicCarItem {
  id: number;
  licensePlate: string;
  brandName: string;
  modelName: string;
  year: number | null;
  bodyType: string;
  transmission: string | null;
  fuelType: string | null;
  pricePerDay: number;
  deposit: number;
  photoUrl: string | null;
  photoUrls: string[];
  districtTitle: string;
  officeAddress: string;
  rating: number | null;
  totalRatings: number | null;
  pathSegment: string;
}

interface PopularCarsSectionProps {
  cars: PublicCarItem[];
}

const formatMoney = (value: number) => `฿${Math.round(value).toLocaleString()}`;

export default function PopularCarsSection({ cars }: PopularCarsSectionProps) {
  const [pageByDistrict, setPageByDistrict] = useState<Record<string, number>>({});
  const [activePhotoByCar, setActivePhotoByCar] = useState<Record<number, number>>({});
  const [failedPhotoIndexesByCar, setFailedPhotoIndexesByCar] = useState<Record<number, number[]>>({});
  const pageSize = 3;

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
                      className="w-8 h-8 rounded-full bg-white text-gray-800 hover:bg-gray-800 hover:text-white disabled:opacity-40"
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
                      className="w-8 h-8 rounded-full bg-white text-gray-800 hover:bg-gray-800 hover:text-white disabled:opacity-40"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {visibleCars.map((car) => {
                    const photoUrls = car.photoUrls.length ? car.photoUrls : (car.photoUrl ? [car.photoUrl] : []);
                    const failedIndexes = failedPhotoIndexesByCar[car.id] || [];
                    const availablePhotoEntries = photoUrls
                      .map((url, index) => ({ url, index }))
                      .filter((entry) => !failedIndexes.includes(entry.index));
                    const selectedFromAvailable = activePhotoByCar[car.id] || 0;
                    const safeAvailablePos = Math.max(0, Math.min(selectedFromAvailable, Math.max(availablePhotoEntries.length - 1, 0)));
                    const activeEntry = availablePhotoEntries[safeAvailablePos] || null;
                    const currentPhotoUrl = activeEntry?.url || null;
                    const activeOriginalIndex = activeEntry?.index ?? -1;

                    return (
                      <article key={car.id} className="rounded-2xl bg-white overflow-hidden">
                        <Link
                          to={`/cars/${car.pathSegment}`}
                          className="relative hidden sm:block aspect-[16/10] bg-gray-100"
                          onMouseLeave={() =>
                            setActivePhotoByCar((prev) => ({
                              ...prev,
                              [car.id]: 0,
                            }))
                          }
                        >
                          {currentPhotoUrl ? (
                            <img
                              src={currentPhotoUrl}
                              alt={`${car.brandName} ${car.modelName}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={() => {
                                if (activeOriginalIndex < 0) return;
                                setFailedPhotoIndexesByCar((prev) => {
                                  const existing = prev[car.id] || [];
                                  if (existing.includes(activeOriginalIndex)) return prev;
                                  return {
                                    ...prev,
                                    [car.id]: [...existing, activeOriginalIndex],
                                  };
                                });
                                setActivePhotoByCar((prev) => ({
                                  ...prev,
                                  [car.id]: 0,
                                }));
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                              No photo
                            </div>
                          )}

                          {photoUrls.length > 1 ? (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/45 px-2 py-1">
                              {photoUrls.map((_, index) => (
                                <span
                                  key={`${car.id}-dot-${index}`}
                                  onMouseEnter={() =>
                                    setActivePhotoByCar((prev) => {
                                      const visiblePos = availablePhotoEntries.findIndex((entry) => entry.index === index);
                                      if (visiblePos < 0) return prev;
                                      return {
                                        ...prev,
                                        [car.id]: visiblePos,
                                      };
                                    })
                                  }
                                  className={`block h-1.5 w-1.5 rounded-full ${index === activeOriginalIndex ? "bg-white" : "bg-white/50"}`}
                                />
                              ))}
                            </div>
                          ) : null}
                        </Link>
                        <div className="sm:hidden aspect-[16/10] bg-gray-100">
                          {currentPhotoUrl ? (
                            <img
                              src={currentPhotoUrl}
                              alt={`${car.brandName} ${car.modelName}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={() => {
                                if (activeOriginalIndex < 0) return;
                                setFailedPhotoIndexesByCar((prev) => {
                                  const existing = prev[car.id] || [];
                                  if (existing.includes(activeOriginalIndex)) return prev;
                                  return {
                                    ...prev,
                                    [car.id]: [...existing, activeOriginalIndex],
                                  };
                                });
                                setActivePhotoByCar((prev) => ({
                                  ...prev,
                                  [car.id]: 0,
                                }));
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                              No photo
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-100 px-3 pt-3 pb-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-semibold text-gray-800">
                              {car.brandName} {car.modelName}
                              <span className="ml-2 text-sm font-normal text-gray-500">
                                {car.year || "Year N/A"}
                              </span>
                            </h3>
                          </div>

                          <div className="flex items-center justify-between">
                            <p className="text-sm text-gray-500">
                              {car.rating?.toFixed(2) || "N/A"}{" "}
                              <StarIcon className="inline w-4 h-4 pb-1 text-green-600 align-middle" />{" "}
                              ({car.totalRatings || 0})
                            </p>
                            <p className="text-base font-semibold text-gray-800">
                              {formatMoney(car.pricePerDay)}
                              <span className="ml-1 text-sm font-normal text-gray-500">/day</span>
                            </p>
                          </div>

                          <Link to={`/cars/${car.pathSegment}`} className="block sm:hidden mb-3">
                            <ClientButton type="button" className="w-full text-sm">
                              Book now
                            </ClientButton>
                          </Link>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  );
}
