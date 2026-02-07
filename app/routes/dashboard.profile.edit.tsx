import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData, Form } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import { eq } from "drizzle-orm";
import PageHeader from "~/components/ui/PageHeader";
import Button from "~/components/ui/Button";
import BackButton from "~/components/ui/BackButton";
import { Input } from "~/components/ui/Input";
import FormSection from "~/components/ui/FormSection";
import PhotoUpload from "~/components/ui/PhotoUpload";
import DocumentPhotosUpload from "~/components/ui/DocumentPhotosUpload";
import { UserIcon, BuildingOfficeIcon, DocumentTextIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { uploadAvatarFromBase64, deleteAvatar } from "~/lib/r2.server";
import ProfileForm from "~/components/profile/ProfileForm";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const sessionUser = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const fullUser = await db.select().from(schema.users).where(eq(schema.users.id, sessionUser.id)).get();
    if (!fullUser) throw new Response("User not found", { status: 404 });

    // Load reference data
    const [countries, hotels, locations, districts] = await Promise.all([
        db.select().from(schema.countries).all(),
        db.select().from(schema.hotels).all(),
        db.select().from(schema.locations).all(),
        db.select().from(schema.districts).all(),
    ]);

    return { user: fullUser, countries, hotels, locations, districts };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    // Get current user data
    const currentUser = await db.select().from(schema.users).where(eq(schema.users.id, user.id)).get();
    if (!currentUser) throw new Response("User not found", { status: 404 });

    let avatarUrl = currentUser.avatarUrl;

    // Handle avatar upload
    const avatarBase64 = formData.get("avatarBase64") as string | null;
    const avatarFileName = formData.get("avatarFileName") as string | null;

    if (avatarBase64 && avatarFileName) {
        // Delete old avatar if exists
        if (currentUser.avatarUrl) {
            try {
                await deleteAvatar(context.cloudflare.env.ASSETS, currentUser.avatarUrl);
            } catch (error) {
                console.error("Failed to delete old avatar:", error);
            }
        }

        // Upload new avatar
        avatarUrl = await uploadAvatarFromBase64(
            context.cloudflare.env.ASSETS,
            user.id,
            avatarBase64,
            avatarFileName
        );
    }

    // Handle avatar removal
    const removeAvatar = formData.get("removeAvatar") === "true";
    if (removeAvatar && currentUser.avatarUrl) {
        try {
            await deleteAvatar(context.cloudflare.env.ASSETS, currentUser.avatarUrl);
            avatarUrl = null;
        } catch (error) {
            console.error("Failed to delete avatar:", error);
        }
    }

    await db.update(schema.users)
        .set({
            name: formData.get("name") as string || null,
            surname: formData.get("surname") as string || null,
            phone: formData.get("phone") as string || null,
            whatsapp: formData.get("whatsapp") as string || null,
            telegram: formData.get("telegram") as string || null,
            passportNumber: formData.get("passportNumber") as string || null,
            citizenship: formData.get("citizenship") as string || null,
            city: formData.get("city") as string || null,
            countryId: formData.get("countryId") ? parseInt(formData.get("countryId") as string) : null,
            dateOfBirth: formData.get("dateOfBirth") ? new Date(formData.get("dateOfBirth") as string) : null,
            gender: formData.get("gender") as "male" | "female" | "other" || null,
            hotelId: formData.get("hotelId") ? parseInt(formData.get("hotelId") as string) : null,
            roomNumber: formData.get("roomNumber") as string || null,
            locationId: formData.get("locationId") ? parseInt(formData.get("locationId") as string) : null,
            districtId: formData.get("districtId") ? parseInt(formData.get("districtId") as string) : null,
            address: formData.get("address") as string || null,
            avatarUrl,
            updatedAt: new Date(),
        })
        .where(eq(schema.users.id, user.id));

    return redirect("/profile");
}

export default function EditProfilePage() {
    const { user, countries, hotels, locations, districts } = useLoaderData<typeof loader>();

    return (
        <ProfileForm
            user={user}
            countries={countries}
            hotels={hotels}
            locations={locations}
            districts={districts}
            isEdit={true}
        />
    );
}
