import { format } from "date-fns";
import Card from '~/components/shared/ui/Card';
import { formatContactPhone } from "~/lib/phone";

interface BookingDetailsCardProps {
  booking: {
    status: string;
    startDate: string;
    endDate: string;
    clientName: string | null;
    clientSurname: string | null;
    clientPhone: string | null;
    clientEmail: string | null;
    clientPassport: string | null;
    pickupDistrictId: number | null;
    pickupHotel: string | null;
    pickupRoom: string | null;
    returnDistrictId: number | null;
    returnHotel: string | null;
    returnRoom: string | null;
    notes: string | null;
    companyCar: {
      licensePlate: string;
      year: number | null;
      template?: { brand?: { name?: string | null }; model?: { name?: string | null } };
      color?: { name?: string | null };
    };
    pickupDistrict?: { name?: string | null };
    returnDistrict?: { name?: string | null };
  };
}

const statusColors = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  converted: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
} as const;

export default function BookingDetailsCard({ booking }: BookingDetailsCardProps) {
  const statusClass = statusColors[booking.status as keyof typeof statusColors] ?? "bg-gray-100 text-gray-700";

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Booking Details</h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusClass}`}>
          {booking.status}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm text-gray-500">Car</h3>
          <p className="text-base text-gray-900">
            {booking.companyCar.template?.brand?.name} {booking.companyCar.template?.model?.name} {booking.companyCar.year}
          </p>
          <p className="text-sm text-gray-600">
            {booking.companyCar.licensePlate} • {booking.companyCar.color?.name}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-sm text-gray-500">Start Date</h3>
            <p className="text-base text-gray-900">
              {format(new Date(booking.startDate), "MMM dd, yyyy")}
            </p>
          </div>
          <div>
            <h3 className="text-sm text-gray-500">End Date</h3>
            <p className="text-base text-gray-900">
              {format(new Date(booking.endDate), "MMM dd, yyyy")}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-sm text-gray-500">Client</h3>
          <p className="text-base text-gray-900">
            {booking.clientName} {booking.clientSurname}
          </p>
          <p className="text-sm text-gray-600">
            {formatContactPhone(booking.clientPhone)} {booking.clientEmail && `• ${booking.clientEmail}`}
          </p>
          {booking.clientPassport && (
            <p className="text-sm text-gray-600">
              Passport: {booking.clientPassport}
            </p>
          )}
        </div>

        {(booking.pickupDistrictId || booking.pickupHotel) && (
          <div>
            <h3 className="text-sm text-gray-500">Pickup</h3>
            <p className="text-sm text-gray-900">
              {booking.pickupDistrict?.name}
              {booking.pickupHotel && ` • ${booking.pickupHotel}`}
              {booking.pickupRoom && ` • Room ${booking.pickupRoom}`}
            </p>
          </div>
        )}

        {(booking.returnDistrictId || booking.returnHotel) && (
          <div>
            <h3 className="text-sm text-gray-500">Return</h3>
            <p className="text-sm text-gray-900">
              {booking.returnDistrict?.name}
              {booking.returnHotel && ` • ${booking.returnHotel}`}
              {booking.returnRoom && ` • Room ${booking.returnRoom}`}
            </p>
          </div>
        )}

        {booking.notes && (
          <div>
            <h3 className="text-sm text-gray-500">Notes</h3>
            <p className="text-sm text-gray-900">{booking.notes}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
