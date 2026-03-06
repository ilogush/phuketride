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
import { z } from "zod";
import { parseWithSchema } from "~/lib/validation.server";

export async function loader({ request }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    return { user };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const formData = await request.formData();

    try {
        const parsed = parseWithSchema(
            z
            .object({
                title: z.string().trim().min(1, "Title is required").max(200, "Title is too long"),
                description: z.string().trim().max(2000, "Description is too long").optional().nullable(),
                eventType: z.string().trim().min(1, "Event type is required"),
                startDate: z.string().trim().min(1, "Start date is required"),
                endDate: z.string().trim().optional().nullable(),
                color: z.string().trim().optional().nullable(),
            }),
            {
                title: formData.get("title"),
                description: formData.get("description"),
                eventType: formData.get("eventType"),
                startDate: formData.get("startDate"),
                endDate: formData.get("endDate"),
                color: formData.get("color"),
            }
        );
        if (!parsed.ok) {
            throw new Error(parsed.error);
        }
        const { title, eventType } = parsed.data;
        const description = parsed.data.description || null;
        const startRaw = parsed.data.startDate;
        const endRaw = parsed.data.endDate || "";

        const startDate = new Date(parseDateTimeFromDisplay(startRaw));
        const endDate = endRaw ? new Date(parseDateTimeFromDisplay(endRaw)) : null;

        if (isNaN(startDate.getTime())) {
            throw new Error("Invalid start date");
        }

        const color = parsed.data.color || "#3B82F6";

        await context.cloudflare.env.DB
            .prepare(
                `
                INSERT INTO calendar_events (
                  company_id, event_type, title, description,
                  start_date, end_date, color, status, created_by, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
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
                user.id,
                new Date().toISOString(),
                new Date().toISOString()
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
