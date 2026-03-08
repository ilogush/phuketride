import { useState } from "react";
import { Form, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/cars.$id.checkout";
import Header from "~/components/public/Header";
import Footer from "~/components/public/Footer";
import Breadcrumbs from "~/components/public/Breadcrumbs";
import CheckoutSummaryCard from "~/components/public/car/CheckoutSummaryCard";
import PublicCheckoutFormPanel from "~/components/public/car/PublicCheckoutFormPanel";
import {
  loadPublicCheckoutPage,
  submitPublicCheckout,
} from "~/features/public-checkout/public-checkout.service.server";
import { useActionToast } from "~/lib/useActionToast";
import { requirePublicAccess } from "~/lib/access-policy.server";
import { getScopedDb } from "~/lib/db-factory.server";

export function meta({ data }: Route.MetaArgs) {
  const carName = data?.carName || "Car";
  const canonical = data?.canonicalUrl || "https://phuketride.com";
  const title = `Checkout ${carName} | Phuket Ride`;
  const description = `Complete your booking for ${carName} on Phuket Ride. Review trip details, insurance, and total pricing before payment.`;

  return [
    { title },
    { name: "description", content: description },
    { name: "robots", content: "noindex,nofollow" },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:type", content: "website" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:url", content: canonical },
    { name: "twitter:card", content: "summary" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
  ];
}

type CheckoutActionData = {
  error?: string;
};

export async function action({ request, context }: Route.ActionArgs) {
  const { sdb } = await getScopedDb(request, context, requirePublicAccess);
  return submitPublicCheckout({ request, db: sdb.db });
}

export async function loader({ context, params, request }: Route.LoaderArgs) {
  const { sdb } = await getScopedDb(request, context, requirePublicAccess);
  return loadPublicCheckoutPage({
    db: sdb.db,
    request,
    routeCarPath: params.id,
  });
}

export default function CheckoutPage() {
  const data = useLoaderData<typeof loader>();
  const actionData = useActionData<CheckoutActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const [withFullInsurance, setWithFullInsurance] = useState(false);
  const [withBabySeat, setWithBabySeat] = useState(false);
  const [withIslandTrip, setWithIslandTrip] = useState(false);
  const [withKrabiTrip, setWithKrabiTrip] = useState(false);
  const [withUnlimitedTrips, setWithUnlimitedTrips] = useState(false);
  const [bookingRate, setBookingRate] = useState<"non_refundable" | "refundable">("non_refundable");

  const standardInsurance = Number(data.insuranceTotal || 0);
  const fullInsurance = Number(data.fullInsuranceMinPrice || data.fullInsuranceMaxPrice || 0);
  const hasFullInsurance = fullInsurance > 0;
  const hasBabySeatOption = Number(data.babySeatPricePerDay || 0) > 0;
  const hasIslandTripOption = Number(data.islandTripPrice || 0) > 0;
  const hasKrabiTripOption = Number(data.krabiTripPrice || 0) > 0;
  const unlimitedTripsExtra = 0;
  const selectedInsurance = withFullInsurance && hasFullInsurance ? fullInsurance : standardInsurance;
  const babySeatExtra = withBabySeat && hasBabySeatOption
    ? Number(data.babySeatPricePerDay || 0) * Number(data.effectiveRentalDays || 0)
    : 0;
  const islandTripExtra = withIslandTrip && hasIslandTripOption ? Number(data.islandTripPrice || 0) : 0;
  const krabiTripExtra = withKrabiTrip && hasKrabiTripOption ? Number(data.krabiTripPrice || 0) : 0;
  const liveExtrasTotal = Number(data.extrasTotal || 0) + babySeatExtra + islandTripExtra + krabiTripExtra + (withUnlimitedTrips ? unlimitedTripsExtra : 0);
  const effectiveDeposit = withFullInsurance && hasFullInsurance ? 0 : Number(data.deposit || 0);
  const liveSubtotal = Number(data.baseTripCost || 0) + Number(data.deliveryFee || 0) + Number(data.returnFee || 0) + selectedInsurance + liveExtrasTotal;
  const liveSalesTax = liveSubtotal * 0.07;
  const liveTripTotal = liveSubtotal + liveSalesTax;
  const refundableRateFee = 1000;
  const refundableTripTotal = liveTripTotal + refundableRateFee;
  const nonRefundableDisplayedTotal = Math.round(liveTripTotal);
  const refundableDisplayedTotal = Math.round(refundableTripTotal);
  const refundableSavings = Math.max(0, refundableDisplayedTotal - nonRefundableDisplayedTotal);
  const selectedTripTotal = bookingRate === "refundable" ? refundableTripTotal : liveTripTotal;
  const breadcrumbs = [
    { label: "Home", to: "/" },
    { label: "Cars" },
    { label: data.carBreadcrumbName, to: `/cars/${data.carPathSegment}` },
    { label: "Checkout" },
  ];

  useActionToast(actionData?.error);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Breadcrumbs items={breadcrumbs} />
      <main className="max-w-5xl mx-auto px-4">
        <Form method="post">
          <input type="hidden" name="carId" value={data.carId} />
          <input type="hidden" name="bookingRate" value={bookingRate} />
          <input type="hidden" name="pickupAt" value={data.pickupAt} />
          <input type="hidden" name="returnAt" value={data.returnAt} />
          <input type="hidden" name="pickupDistrictId" value={data.pickupDistrictId} />
          <input type="hidden" name="returnDistrictId" value={data.returnDistrictId} />
          <input type="hidden" name="withFullInsurance" value={String(withFullInsurance && hasFullInsurance)} />
          <input type="hidden" name="withBabySeat" value={String(withBabySeat && hasBabySeatOption)} />
          <input type="hidden" name="withIslandTrip" value={String(withIslandTrip && hasIslandTripOption)} />
          <input type="hidden" name="withKrabiTrip" value={String(withKrabiTrip && hasKrabiTripOption)} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:items-start">
            <section className="lg:col-span-2">
              <PublicCheckoutFormPanel
                data={data}
                hasFullInsurance={hasFullInsurance}
                fullInsurance={fullInsurance}
                withFullInsurance={withFullInsurance}
                setWithFullInsurance={setWithFullInsurance}
                bookingRate={bookingRate}
                setBookingRate={setBookingRate}
                refundableSavings={refundableSavings}
                nonRefundableDisplayedTotal={nonRefundableDisplayedTotal}
                refundableDisplayedTotal={refundableDisplayedTotal}
                hasBabySeatOption={hasBabySeatOption}
                hasIslandTripOption={hasIslandTripOption}
                hasKrabiTripOption={hasKrabiTripOption}
                withUnlimitedTrips={withUnlimitedTrips}
                setWithUnlimitedTrips={setWithUnlimitedTrips}
                withBabySeat={withBabySeat}
                setWithBabySeat={setWithBabySeat}
                withIslandTrip={withIslandTrip}
                setWithIslandTrip={setWithIslandTrip}
                withKrabiTrip={withKrabiTrip}
                setWithKrabiTrip={setWithKrabiTrip}
              />
            </section>

            <CheckoutSummaryCard
              carName={data.carName}
              photoUrl={data.photoUrl}
              year={data.year}
              rating={data.rating}
              trips={data.trips}
              pickupAt={data.pickupAt}
              returnAt={data.returnAt}
              address={data.address}
              returnAddress={data.returnAddress}
              deliveryFee={data.deliveryFee}
              returnFee={data.returnFee}
              extrasTotal={liveExtrasTotal}
              pickupAfterHoursFee={data.pickupAfterHoursFee}
              returnAfterHoursFee={data.returnAfterHoursFee}
              withUnlimitedTrips={withUnlimitedTrips}
              babySeatExtra={babySeatExtra}
              islandTripExtra={islandTripExtra}
              krabiTripExtra={krabiTripExtra}
              insuranceTotal={selectedInsurance}
              depositTotal={effectiveDeposit}
              subtotal={liveSubtotal}
              salesTax={liveSalesTax}
              includedDistance={data.includedDistance}
              tripTotal={selectedTripTotal}
              submitting={isSubmitting}
            />
          </div>
        </Form>
      </main>
      <Footer />
    </div>
  );
}
