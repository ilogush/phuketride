import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { Form, useLoaderData, useNavigate } from "react-router";

import { requireAuth } from "~/lib/auth.server";
import FormSection from "~/components/dashboard/FormSection";
import FormInput from "~/components/dashboard/FormInput";
import FormSelect from "~/components/dashboard/FormSelect";
import { Textarea } from "~/components/dashboard/Textarea";
import Modal from "~/components/dashboard/Modal";
import Button from "~/components/dashboard/Button";
import { useUrlToast } from "~/lib/useUrlToast";
import { CalendarIcon } from "@heroicons/react/24/outline";
import { useDateMasking } from "~/lib/useDateMasking";
import { parseDateTimeFromDisplay } from "~/lib/formatters";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();

    try {
        const title = formData.get("title") as string;
        const description = formData.get("description") as string || null;
        const eventType = formData.get("eventType") as string;
        const startRaw = formData.get("startDate") as string;
        const endRaw = formData.get("endDate") as string;

        const startDate = new Date(parseDateTimeFromDisplay(startRaw));
        const endDate = endRaw ? new Date(parseDateTimeFromDisplay(endRaw)) : null;

        if (isNaN(startDate.getTime())) {
            throw new Error("Invalid start date");
        }

        const color = formData.get("color") as string || "#3B82F6";

        await context.cloudflare.env.DB
            .prepare(
                `
                INSERT INTO calendar_events (
                  company_id, event_type, title, description,
                  start_date, end_date, color, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
                `
            )
            .bind(
                user.companyId!,
                eventType,
                title,
                description,
                startDate.getTime(),
                endDate ? endDate.getTime() : null,
                color,
                user.id
            )
            .run();

        return redirect(`/calendar?success=${encodeURIComponent("Event created successfully")}`);
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create event";
        return redirect(`/calendar/new?error=${encodeURIComponent(message)}`);
    }
}

export default function NewCalendarEvent() {
    const navigate = useNavigate();
    useUrlToast();
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
            isOpen={true}
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
                            <FormInput
                                label="Title"
                                name="title"
                                placeholder="Event title"
                                required
                            />
                        </div>
                        <FormSelect
                            label="Type"
                            name="eventType"
                            options={eventTypes}
                            defaultValue="general"
                            required
                        />
                        <FormInput
                            label="Color"
                            name="color"
                            type="color"
                            defaultValue="#3B82F6"
                        />
                        <div className="col-span-2">
                            <FormInput
                                label="Start Date & Time"
                                name="startDate"
                                type="text"
                                placeholder="DD/MM/YYYY HH:mm"
                                required
                                onChange={maskDateTimeInput}
                            />
                        </div>
                        <div className="col-span-2">
                            <FormInput
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
                    <Button type="submit" variant="primary">
                        Create Event
                    </Button>
                </div>
            </Form>
        </Modal>
    );
}
