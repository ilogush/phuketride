import type { Route } from "./+types/home";
import { useMemo, useState } from "react";
import { useLoaderData } from "react-router";
import Header from "~/components/public/Header";
import HeroSection from "~/components/public/HeroSection";
import BodyTypeFilters from "~/components/public/BodyTypeFilters";
import PopularCarsSection from "~/components/public/PopularCarsSection";
import Footer from "~/components/public/Footer";
import { buildCarPathSegment, buildCompanySlug } from "~/lib/car-path";
import { getCarPhotoUrls } from "~/lib/car-photos";
import { MinusIcon, PlusIcon } from "@heroicons/react/24/outline";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Best Car Rental | Professional Fleet Management" },
    { 
      name: "description", 
      content: "Advanced car rental and fleet management system. Track contracts, manage payments, and optimize your business with Best Car Rental." 
    },
    { name: "author", content: "Best Car Rental Team" },
    { name: "keywords", content: "car rental,fleet management,booking system,Best Car Rental,Hua Hin car rental" },
    { name: "creator", content: "Best Car Rental" },
    { name: "robots", content: "index, follow" },
    { property: "og:title", content: "Best Car Rental | Professional Fleet Management" },
    { property: "og:description", content: "Steamlined car rental operations and fleet management." },
    { property: "og:url", content: "https://phuketride.com" },
    { property: "og:site_name", content: "Best Car Rental" },
    { property: "og:locale", content: "en_US" },
    { property: "og:image", content: "http://localhost:3000/og-image.png" },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:image:alt", content: "Best Car Rental Dashboard" },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: "Best Car Rental | Professional Fleet Management" },
    { name: "twitter:description", content: "Advanced car rental and fleet management system." },
    { name: "twitter:image", content: "http://localhost:3000/og-image.png" },
  ];
}

export async function loader({ context, request }: Route.LoaderArgs) {
  const d1 = context.cloudflare.env.DB;

  let rows: Array<Record<string, unknown>> = [];
  try {
    const rowsResult = await d1
      .prepare(
        `
        SELECT
          cc.id AS id,
          cc.license_plate AS licensePlate,
          cc.company_id AS companyId,
          cb.name AS brandName,
          cm.name AS modelName,
          bt.name AS bodyType,
          cc.year AS year,
          cc.transmission AS transmission,
          ft.name AS fuelType,
          cc.price_per_day AS pricePerDay,
          cc.deposit AS deposit,
          cc.photos AS photos,
          c.name AS companyName,
          l.name AS locationName,
          d.name AS districtName,
          c.street AS street,
          c.house_number AS houseNumber,
          crm.total_rating AS rating,
          crm.total_ratings AS totalRatings
        FROM company_cars cc
        LEFT JOIN car_templates ct ON cc.template_id = ct.id
        LEFT JOIN car_brands cb ON ct.brand_id = cb.id
        LEFT JOIN car_models cm ON ct.model_id = cm.id
        LEFT JOIN body_types bt ON ct.body_type_id = bt.id
        LEFT JOIN fuel_types ft ON cc.fuel_type_id = ft.id
        INNER JOIN companies c ON cc.company_id = c.id
        LEFT JOIN locations l ON c.location_id = l.id
        LEFT JOIN districts d ON c.district_id = d.id
        LEFT JOIN car_rating_metrics crm ON cc.id = crm.company_car_id
        WHERE cc.status = 'available'
          AND cc.archived_at IS NULL
          AND c.archived_at IS NULL
        ORDER BY cc.created_at DESC
        LIMIT 120
        `
      )
      .all();
    rows = (rowsResult.results ?? []) as Array<Record<string, unknown>>;
  } catch {
    const fallbackRowsResult = await d1
      .prepare(
        `
        SELECT
          cc.id AS id,
          cc.company_id AS companyId,
          cc.price_per_day AS pricePerDay,
          cc.deposit AS deposit,
          cc.photos AS photos,
          cc.year AS year,
          cc.transmission AS transmission,
          c.name AS companyName
        FROM company_cars cc
        INNER JOIN companies c ON cc.company_id = c.id
        WHERE cc.status = 'available'
        ORDER BY cc.created_at DESC
        LIMIT 120
        `
      )
      .all()
      .catch(() => ({ results: [] as Record<string, unknown>[] }));
    rows = (fallbackRowsResult.results ?? []) as Array<Record<string, unknown>>;
  }

  const districtsResult = await d1
    .prepare("SELECT name FROM districts ORDER BY name")
    .all()
    .catch(() => ({ results: [] as Record<string, unknown>[] }));
  const districtsRows = ((districtsResult.results ?? []) as Array<Record<string, unknown>>);

  const cars = rows.map((row) => {
    const photoUrls = getCarPhotoUrls(row.photos, request.url);
    const fallbackPhotoUrl = photoUrls[0] || null;

    const districtTitle =
      (typeof row.districtName === "string" && row.districtName) ||
      (typeof row.locationName === "string" && row.locationName) ||
      (typeof row.companyName === "string" && row.companyName) ||
      "Available cars";
    const officeAddress = [row.street, row.houseNumber].filter(Boolean).map(String).join(" ");

    return {
      id: Number(row.id),
      licensePlate: String(row.licensePlate || ""),
      companyId: Number(row.companyId),
      brandName: (row.brandName as string) || "Car",
      modelName: (row.modelName as string) || `#${String(row.id)}`,
      bodyType: (row.bodyType as string) || "",
      year: (row.year as number | null) ?? null,
      transmission: (row.transmission as string | null) ?? null,
      fuelType: (row.fuelType as string | null) ?? null,
      pricePerDay: Number(row.pricePerDay || 0),
      deposit: Number(row.deposit || 0),
      photoUrl: photoUrls[0] || fallbackPhotoUrl,
      photoUrls,
      districtTitle,
      officeAddress: officeAddress || String(row.companyName || ""),
      rating: row.rating ? Number(row.rating) : null,
      totalRatings: row.totalRatings ? Number(row.totalRatings) : null,
      pathSegment: buildCarPathSegment(
        String(row.companyName || ""),
        (row.brandName as string) || "Car",
        (row.modelName as string) || "",
        String(row.licensePlate || ""),
      ),
      companySlug: buildCompanySlug(String(row.companyName || "")),
    };
  });

  const districts = Array.from(
    new Set(
      districtsRows
        .map((row) => row.name)
        .filter((name): name is string => typeof name === "string" && Boolean(name))
    )
  );

  return { cars, districts };
}

export default function Home() {
  const { cars, districts } = useLoaderData<typeof loader>();
  const [activeBodyType, setActiveBodyType] = useState("All");
  const [openFaqId, setOpenFaqId] = useState<string | null>("faq-1");

  const bodyTypes = useMemo(() => {
    const unique = Array.from(new Set(cars.map((car) => car.bodyType).filter((type) => Boolean(type))));
    return ["All", ...unique];
  }, [cars]);

  const filteredCars = useMemo(() => {
    if (activeBodyType === "All") return cars;
    return cars.filter((car) => car.bodyType === activeBodyType);
  }, [cars, activeBodyType]);

  const faqItems = [
    {
      id: "faq-1",
      q: "What do I need to rent a car?",
      a: "To rent on PhuketRide, you typically need a valid passport, a valid driver license, and booking confirmation. Some hosts may request additional verification details such as contact number or flight information for precise handoff timing. The full requirement list is always shown in the specific car listing, so you know exactly what to prepare before pickup.",
    },
    {
      id: "faq-2",
      q: "Are there any hidden fees?",
      a: "Key charges are visible before confirmation: daily rental rate, deposit amount, selected insurance, and district delivery cost when applicable. This gives you a clear total estimate before checkout and helps compare offers without last-minute surprises. If a listing has extra conditions, they are explicitly stated in the car details.",
    },
    {
      id: "faq-3",
      q: "Can I get the car delivered to my hotel?",
      a: "Yes, many hosts support hotel delivery. Availability and price depend on district, host schedule, and listing settings. Before booking, you can see whether delivery is supported for your area and choose a convenient handoff location in advance. This is especially useful if you want to start your trip directly from your hotel.",
    },
    {
      id: "faq-4",
      q: "Can I get the car at the airport?",
      a: "Airport handoff is available when the host supports it. Conditions depend on arrival time, meeting zone, and district delivery pricing. Core details are shown in the listing, and specifics can be finalized before confirmation. This helps you avoid extra transfer steps after landing and move directly into your trip.",
    },
    {
      id: "faq-5",
      q: "How is the deposit calculated?",
      a: "The deposit is set by the host and displayed in the listing before booking. The amount may vary by car class, insurance setup, rental length, and host policy. You see this value in advance and can compare alternatives with lower upfront requirements. This keeps budgeting predictable for guests and protection clear for hosts.",
    },
    {
      id: "faq-6",
      q: "Is there a mileage limit?",
      a: "Mileage rules depend on the specific listing and host policy. Some cars offer flexible limits, while others use fixed daily or total caps for the rental period. Check this field before confirming, especially for longer routes around the island. Choosing the right mileage policy upfront helps avoid extra charges.",
    },
    {
      id: "faq-7",
      q: "Can I add a second driver?",
      a: "In many cases, yes, but it depends on host rules and insurance conditions. Additional drivers are usually required to provide identity and license details for verification. If you plan to share driving, confirm this before payment so everything is properly documented. This improves safety and reduces disputes during rental.",
    },
    {
      id: "faq-8",
      q: "What insurance options are available?",
      a: "Each listing shows available insurance plans and their pricing, so you can choose the right protection level for your trip. Options generally differ by coverage scope, deductible, and final cost impact. Seeing this comparison upfront makes decision-making easier. You can choose basic protection or broader full-coverage packages.",
    },
    {
      id: "faq-9",
      q: "What if my flight is delayed?",
      a: "If your flight is delayed, notify support and the host as early as possible. In most cases, a revised handoff slot can be arranged without cancelling the booking. Early updates make schedule adjustments easier and reduce airport coordination issues. This keeps your rental start smooth even with airline changes.",
    },
    {
      id: "faq-10",
      q: "Can I extend my rental period?",
      a: "Extensions are possible if the car remains available after your current end date and the host approves the request. It is best to request changes early, especially in high season when calendars fill quickly. Once approved, pricing is recalculated for the new dates and terms. This lets you continue your trip without changing vehicles.",
    },
    {
      id: "faq-11",
      q: "How does deposit return work?",
      a: "Deposit return is processed after rental completion and condition check according to booking terms. Hosts usually verify basic points such as exterior condition, equipment completeness, and agreed usage rules. If there are no disputes, the deposit is returned within the stated timeline. This creates a clear and predictable closeout process for both sides.",
    },
    {
      id: "faq-12",
      q: "What should I do if my plans change?",
      a: "If your plans change, contact support and the host immediately through PhuketRide. Early notice increases the chance of adjusting dates, pickup location, or other booking details with minimal loss. Modification terms depend on the specific booking and timing of your request. Acting quickly gives you more available options and better outcomes.",
    },
  ];
  const faqColumns = [faqItems.slice(0, 6), faqItems.slice(6, 12)];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex-1">
        <div className="max-w-5xl mx-auto px-4 pt-0 pb-6 space-y-6">
          <HeroSection districts={districts} />
          <BodyTypeFilters
            bodyTypes={bodyTypes}
            activeType={activeBodyType}
            onTypeChange={setActiveBodyType}
          />
          <PopularCarsSection cars={filteredCars} />
          <section id="why-phuketride-better" className="py-2 sm:py-3">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">
              Why Is Renting with PhuketRide Better Than Other Services?
            </h2>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">No Middlemen</h3>
                <p className="mt-2 text-sm text-gray-700">
                  You book directly with the car owner without layered marketplace markups.
                  This keeps final rental pricing fair, competitive, and easier to trust.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Transparent Pricing</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Before confirmation, you see rental price, deposit, insurance, and key terms.
                  This removes surprise charges and makes comparison between listings straightforward.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Smart Local Pickup</h3>
                <p className="mt-2 text-sm text-gray-700">
                  The platform lets you choose a car in your exact location directly from the owner, without delivery cost impact.
                  With local matching in your district, savings can reach up to 100% of one rental day price.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Strong Car Selection</h3>
                <p className="mt-2 text-sm text-gray-700">
                  You can compare options by price, rental terms, and host rating in one place.
                  This helps you pick the right car faster for your route, schedule, and travel style.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Built for Phuket</h3>
                <p className="mt-2 text-sm text-gray-700">
                  The experience is tailored to Phuket and real island rental scenarios.
                  Booking becomes more practical and predictable, especially during high season periods.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Fast Support</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Quick communication with support and hosts reduces resolution time.
                  Pickup, booking updates, and returns feel smoother and more predictable end to end.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">No-Deposit Offers</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Unique listings are available where you can rent with zero deposit requirements.
                  This lowers entry cost and frees budget for accommodation, activities, and island travel.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Full Insurance Options</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Some cars include full insurance plans with broader risk coverage.
                  This gives more peace of mind and reduces financial exposure during unexpected incidents.
                </p>
              </article>
              <article className="rounded-2xl bg-gray-100 p-4">
                <h3 className="font-semibold text-gray-900">Unique Terms</h3>
                <p className="mt-2 text-sm text-gray-700">
                  Hosts publish custom terms: flexible handoff, special pricing, and seasonal advantages.
                  You get tailored deals instead of generic offers, better matched to your budget and trip plan.
                </p>
              </article>
            </div>
          </section>
          <section className="pt-2 sm:pt-3 pb-0">
            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900">Frequently Asked Questions</h2>
            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
              {faqColumns.map((column, columnIndex) => (
                <div key={`faq-column-${columnIndex}`} className="space-y-3">
                  {column.map((item) => {
                    const isOpen = openFaqId === item.id;
                    return (
                      <article key={item.id} className="rounded-2xl bg-gray-100 px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setOpenFaqId((prev) => (prev === item.id ? null : item.id))}
                          className="w-full text-left font-medium text-gray-900 flex items-center justify-between gap-3"
                          aria-expanded={isOpen}
                        >
                          <span>{item.q}</span>
                          {isOpen ? (
                            <MinusIcon className="w-5 h-5 text-gray-500 shrink-0" />
                          ) : (
                            <PlusIcon className="w-5 h-5 text-gray-500 shrink-0" />
                          )}
                        </button>
                        {isOpen ? (
                          <p className="mt-2 text-sm text-gray-700">{item.a}</p>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
