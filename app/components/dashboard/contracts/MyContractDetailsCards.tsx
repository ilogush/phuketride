import { Form } from "react-router";
import { CalendarIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import Card from "~/components/dashboard/Card";
import StatusBadge from "~/components/dashboard/StatusBadge";
import type {
  ContractDetailsRow,
  ContractPaymentRow,
  ExistingReviewRow,
} from "~/lib/my-contracts-detail-types";
import { getCurrencySymbol } from "~/lib/formatters";

type MyContractDetailsCardsProps = {
  contract: ContractDetailsRow;
  payments: ContractPaymentRow[];
  existingReview: ExistingReviewRow | null;
  canLeaveReview: boolean;
};

export default function MyContractDetailsCards({
  contract,
  payments,
  existingReview,
  canLeaveReview,
}: MyContractDetailsCardsProps) {
  const extraNameMap: Record<string, string> = {
    full_insurance: "Full Insurance",
    baby_seat: "Baby Seat",
    island_trip: "Island Trip",
    krabi_trip: "Krabi Trip",
  };

  const carPhotos = contract.carPhotos ? JSON.parse(contract.carPhotos) : [];
  const contractPhotos = contract.photos ? JSON.parse(contract.photos) : [];
  const extras = payments.filter((p) => p.extraType && (p.extraEnabled ?? 0) === 1);

  const getStatusVariant = (status: string | null) => {
    switch (status) {
      case "active":
        return "info";
      case "closed":
        return "success";
      default:
        return "neutral";
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contract #{contract.id}</h1>
            <p className="text-sm text-gray-500">Created {format(new Date(contract.createdAt), "MMM dd, yyyy")}</p>
          </div>
        </div>
        <StatusBadge variant={getStatusVariant(contract.status)}>{contract.status}</StatusBadge>
      </div>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Vehicle Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            {carPhotos.length > 0 ? (
              <img src={carPhotos[0]} alt="Car" className="w-full h-48 object-cover rounded-xl mb-4" />
            ) : null}
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Vehicle</p>
              <p className="font-semibold">
                {contract.brandName} {contract.modelName} {contract.carYear}
              </p>
              <p className="text-sm text-gray-600">{contract.colorName} • {contract.carTransmission}</p>
              <p className="text-sm text-gray-600">License Plate: {contract.carLicensePlate}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Rental Period</p>
              <div className="flex items-center gap-2 text-gray-900">
                <CalendarIcon className="h-5 w-5" />
                <span>
                  {format(new Date(contract.startDate), "MMM dd, yyyy")} - {format(new Date(contract.endDate), "MMM dd, yyyy")}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Pickup Location</p>
              <div className="flex items-center gap-2 text-gray-900">
                <MapPinIcon className="h-5 w-5" />
                <span>
                  {contract.pickupHotel || contract.pickupDistrictName}
                  {contract.pickupRoom ? `, Room ${contract.pickupRoom}` : ""}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">Return Location</p>
              <div className="flex items-center gap-2 text-gray-900">
                <MapPinIcon className="h-5 w-5" />
                <span>
                  {contract.returnHotel || contract.returnDistrictName}
                  {contract.returnRoom ? `, Room ${contract.returnRoom}` : ""}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Pricing Details</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Total Amount</span>
            <span className="font-semibold">
              {getCurrencySymbol(contract.totalCurrency)}{contract.totalAmount}
            </span>
          </div>
          {contract.depositAmount ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit</span>
              <span className="font-semibold">
                {getCurrencySymbol(contract.depositCurrency)}{contract.depositAmount}
              </span>
            </div>
          ) : null}
          {extras.map((extra) => (
            <div key={`extra-${extra.id}`} className="flex justify-between">
              <span className="text-gray-600">{extraNameMap[String(extra.extraType)] || extra.extraType}</span>
              <span className="font-semibold">
                {getCurrencySymbol(extra.currency || contract.totalCurrency)}{Number(extra.extraPrice ?? extra.amount ?? 0)}
              </span>
            </div>
          ))}
          {(contract.deliveryCost ?? 0) > 0 ? (
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span className="font-semibold">฿{contract.deliveryCost ?? 0}</span>
            </div>
          ) : null}
        </div>
      </Card>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">{existingReview ? "Update your review" : "Leave a review"}</h2>
        {canLeaveReview ? (
          <Form method="post" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                ["rating", "Overall"],
                ["cleanliness", "Cleanliness"],
                ["maintenance", "Maintenance"],
                ["communication", "Communication"],
                ["convenience", "Convenience"],
                ["accuracy", "Accuracy"],
              ].map(([name, label]) => (
                <label key={name} className="block">
                  <span className="mb-1 block text-sm text-gray-700">{label}</span>
                  <select
                    name={name}
                    defaultValue={String((existingReview as Record<string, number | string | null> | null)?.[name] || existingReview?.rating || 5)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                  >
                    <option value="5">5</option>
                    <option value="4">4</option>
                    <option value="3">3</option>
                    <option value="2">2</option>
                    <option value="1">1</option>
                  </select>
                </label>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm text-gray-700">Review</span>
              <textarea
                name="reviewText"
                defaultValue={existingReview?.reviewText || ""}
                minLength={10}
                required
                rows={5}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800"
                placeholder="Share your rental experience"
              />
            </label>
            <button type="submit" className="inline-flex items-center rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
              {existingReview ? "Update review" : "Submit review"}
            </button>
          </Form>
        ) : (
          <p className="text-sm text-gray-600">Review form becomes available after the rental is completed.</p>
        )}
      </Card>

      <Card padding="lg" className="shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Payment History</h2>
        {payments.length > 0 ? (
          <div className="space-y-3">
            {payments.map((payment) => (
              <div key={payment.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium">
                    {payment.extraType ? (extraNameMap[String(payment.extraType)] || payment.extraType) : (payment.paymentTypeName || "Payment")}
                  </p>
                  <p className="text-sm text-gray-500">{format(new Date(payment.createdAt), "MMM dd, yyyy HH:mm")}</p>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${payment.paymentTypeSign === "-" ? "text-red-600" : "text-green-600"}`}>
                    {(payment.paymentTypeSign || "+")}{getCurrencySymbol(payment.currency)}{payment.amount}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">No payments recorded</p>
        )}
      </Card>

      {contractPhotos.length ? (
        <Card padding="lg" className="shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Contract Photos</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {contractPhotos.map((src: string, idx: number) => (
              <img key={`${src}-${idx}`} src={src} alt={`Contract photo ${idx + 1}`} className="w-full h-28 object-cover rounded-lg" />
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}
