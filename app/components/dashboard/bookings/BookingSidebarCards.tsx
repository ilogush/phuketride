import { format } from "date-fns";
import Card from "~/components/dashboard/Card";
import { getCurrencySymbol } from "~/lib/formatters";

interface BookingSidebarCardsProps {
  booking: {
    currency: string;
    estimatedAmount: number;
    depositAmount: number | null;
    depositPaid: boolean;
    fullInsuranceEnabled: boolean;
    fullInsurancePrice: number | null;
    babySeatEnabled: boolean;
    babySeatPrice: number | null;
    islandTripEnabled: boolean;
    islandTripPrice: number | null;
    krabiTripEnabled: boolean;
    krabiTripPrice: number | null;
    createdAt: string;
    updatedAt: string;
  };
}

export default function BookingSidebarCards({ booking }: BookingSidebarCardsProps) {
  return (
    <>
      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment Summary</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Estimated Amount</span>
            <span className="text-sm font-medium text-gray-900">
              {getCurrencySymbol(booking.currency)}{booking.estimatedAmount.toFixed(2)}
            </span>
          </div>
          {(booking.depositAmount ?? 0) > 0 && (
            <>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deposit</span>
                <span className="text-sm font-medium text-gray-900">
                  {getCurrencySymbol(booking.currency)}{(booking.depositAmount ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deposit Status</span>
                <span className={`text-sm font-medium ${booking.depositPaid ? "text-green-600" : "text-red-600"}`}>
                  {booking.depositPaid ? "Paid" : "Unpaid"}
                </span>
              </div>
            </>
          )}
        </div>
      </Card>

      {(booking.fullInsuranceEnabled || booking.babySeatEnabled || booking.islandTripEnabled || booking.krabiTripEnabled) && (
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Extras</h2>
          <div className="space-y-2">
            {booking.fullInsuranceEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Full Insurance</span>
                <span className="text-gray-900">{getCurrencySymbol(booking.currency)}{(booking.fullInsurancePrice ?? 0).toFixed(2)}</span>
              </div>
            )}
            {booking.babySeatEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Baby Seat</span>
                <span className="text-gray-900">{getCurrencySymbol(booking.currency)}{(booking.babySeatPrice ?? 0).toFixed(2)}</span>
              </div>
            )}
            {booking.islandTripEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Island Trip</span>
                <span className="text-gray-900">{getCurrencySymbol(booking.currency)}{(booking.islandTripPrice ?? 0).toFixed(2)}</span>
              </div>
            )}
            {booking.krabiTripEnabled && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Krabi Trip</span>
                <span className="text-gray-900">{getCurrencySymbol(booking.currency)}{(booking.krabiTripPrice ?? 0).toFixed(2)}</span>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
        <div className="space-y-2 text-sm">
          <div>
            <span className="text-gray-600">Created:</span>
            <span className="text-gray-900 ml-2">
              {format(new Date(booking.createdAt), "MMM dd, yyyy HH:mm")}
            </span>
          </div>
          <div>
            <span className="text-gray-600">Updated:</span>
            <span className="text-gray-900 ml-2">
              {format(new Date(booking.updatedAt), "MMM dd, yyyy HH:mm")}
            </span>
          </div>
        </div>
      </Card>
    </>
  );
}
