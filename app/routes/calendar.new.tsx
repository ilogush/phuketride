import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate } from "react-router";

import FormSection from '~/components/shared/ui/FormSection';
import { Input } from '~/components/shared/ui/Input';
import { Select } from '~/components/shared/ui/Select';
import { Textarea } from '~/components/shared/ui/Textarea';
import Modal from '~/components/shared/ui/Modal';
import Button from '~/components/shared/ui/Button';
import { CalendarIcon } from "@heroicons/react/24/outline";
import { useDateMasking } from "~/lib/useDateMasking";
import { createCalendarEventFromForm } from "~/lib/calendar-page.server";
import { redirectWithRequestError, redirectWithRequestSuccess } from "~/lib/route-feedback";
import { trackServerOperation } from "~/lib/telemetry.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request);
    if (companyId === null) {
        throw new Response("Forbidden", { status: 403 });
    }
    return trackServerOperation({
        event: "calendar.new.load",
        scope: "route.loader",
        request,
        userId: user.id,
        companyId,
        details: { route: "calendar.new" },
        run: async () => ({ user }),
    });
}

export async function action({ request, context }: ActionFunctionArgs) {
    const { user, companyId } = await requireScopedDashboardAccess(request);
    if (companyId === null) {
        throw new Response("Forbidden", { status: 403 });
    }
    return trackServerOperation({
        event: "calendar.new",
        scope: "route.action",
        request,
        userId: user.id,
        companyId,
        details: { route: "calendar.new" },
        run: async () => {
            const formData = await request.formData();
            // parseWithSchema(calendarEventSchema, ...) is delegated to createCalendarEventFromForm.
            const result = await createCalendarEventFromForm({
                db: context.cloudflare.env.DB,
                companyId,
                createdBy: user.id,
                formData,
            });
            if (!result.ok) {
                return redirectWithRequestError(request, "/calendar/new", result.error);
            }

            return redirectWithRequestSuccess(request, "/calendar", "Event created successfully");
        },
    });
}

export default function NewCalendarEvent() {
    const navigate = useNavigate();
    const { maskDateTimeInput } = useDateMasking();

    const eventTypes = [
        { id: "general", name: "General" },
        { id: "meeting", name: "Meeting" },
        { id: "delivery", name: "Delivery" },
        { id: "pickup", name: "Pickup" },
        { id: "maintenance", name: "Maintenance" },
        { id: "document_expiry", name: "Document Expiry" },
        { id: "payment_due", name: "Payment Due" },
        { id: "other", name: "Other" },
    ];

    return (
        <Modal
            open={true}
            onClose={() => navigate("/calendar")}
            title="New Event"
        >
            <Form method="post" className="space-y-4">
                <FormSection
                    title="Event Details"
                    icon={<CalendarIcon className="w-6 h-6" />}
                >
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="col-span-2">
                            <Input
                                label="Title"
                                name="title"
                                placeholder="Event title"
                                required
                            />
                        </div>
                        <Select
                            label="Type"
                            name="eventType"
                            options={eventTypes}
                            defaultValue="general"
                            required
                        />
                        <Input
                            label="Color"
                            name="color"
                            type="color"
                            defaultValue="#3B82F6"
                        />
                        <div className="col-span-2">
                            <Input
                                label="Start Date & Time"
                                name="startDate"
                                type="text"
                                placeholder="DD/MM/YYYY HH:mm"
                                required
                                onChange={maskDateTimeInput}
                            />
                        </div>
                        <div className="col-span-2">
                            <Input
                                label="End Date & Time (Optional)"
                                name="endDate"
                                type="text"
                                placeholder="DD/MM/YYYY HH:mm"
                                onChange={maskDateTimeInput}
                            />
                        </div>
                        <div className="col-span-4">
                            <Textarea
                                label="Description"
                                name="description"
                                rows={3}
                                placeholder="Event description..."
                            />
                        </div>
                    </div>
                </FormSection>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="submit" variant="solid">
                        Create Event
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
