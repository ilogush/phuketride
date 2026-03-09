import { Form } from "react-router";

import BackButton from '~/components/shared/ui/BackButton';
import Button from '~/components/shared/ui/Button';
import PageHeader from '~/components/shared/ui/PageHeader';
import BookingDetailsCard from "~/components/dashboard/bookings/BookingDetailsCard";
import BookingSidebarCards from "~/components/dashboard/bookings/BookingSidebarCards";
import { useUrlToast } from "~/lib/useUrlToast";
import type { BookingDetail } from "./booking-detail.loader.server";

type BookingDetailPageViewProps = {
  booking: BookingDetail;
};

export default function BookingDetailPageView({
  booking,
}: BookingDetailPageViewProps) {
  useUrlToast();

  const canConvert = booking.status === "pending" || booking.status === "confirmed";
  const canCancel = booking.status === "pending" || booking.status === "confirmed";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Booking #${booking.id}`}
        leftActions={<BackButton to="/bookings" />}
        rightActions={
          <div className="flex gap-2">
            {canConvert && (
              <Form method="post">
                <input type="hidden" name="_action" value="convert" />
                <Button type="submit" variant="solid">
                  Convert to Contract
                </Button>
              </Form>
            )}
            {canCancel && (
              <Form method="post">
                <input type="hidden" name="_action" value="cancel" />
                <Button type="submit" variant="outline">
                  Cancel Booking
                </Button>
              </Form>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <BookingDetailsCard booking={booking} />
        </div>

        <div className="space-y-6">
          <BookingSidebarCards booking={booking} />
        </div>
      </div>
    </div>
  );
}
