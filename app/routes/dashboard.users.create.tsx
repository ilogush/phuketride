import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useLoaderData } from "react-router";
import { requireAuth } from "~/lib/auth.server";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "~/db/schema";
import ProfileForm from "~/components/profile/ProfileForm";

export async function loader({ request, context }: LoaderFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }

    const db = drizzle(context.cloudflare.env.DB, { schema });

    // Load reference data
    const [countries, hotels, locations, districts] = await Promise.all([
        db.select().from(schema.countries).all(),
        db.select().from(schema.hotels).all(),
        db.select().from(schema.locations).all(),
        db.select().from(schema.districts).all(),
    ]);

    return { user, countries, hotels, locations, districts };
}

export async function action({ request, context }: ActionFunctionArgs) {
    const user = await requireAuth(request);
    if (user.role !== "admin") {
        throw new Response("Forbidden", { status: 403 });
    }
    const db = drizzle(context.cloudflare.env.DB, { schema });
    const formData = await request.formData();

    const id = crypto.randomUUID();

    await db.insert(schema.users).values({
        id,
        email: formData.get("email") as string,
        role: formData.get("role") as "admin" | "partner" | "manager" | "user",
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
        avatarUrl: null,
        passportPhotos: null,
        driverLicensePhotos: null,
    });

    return redirect("/dashboard.users");
}

export default function CreateUserPage() {
    const { countries, hotels, locations, districts } = useLoaderData<typeof loader>();

    // Empty user object for create mode
    const emptyUser = {
        id: "",
        email: "",
        name: null,
        surname: null,
        phone: null,
        whatsapp: null,
        telegram: null,
        passportNumber: null,
        citizenship: null,
        city: null,
        countryId: null,
        dateOfBirth: null,
        gender: null as "male" | "female" | "other" | null,
        hotelId: null,
        roomNumber: null,
        locationId: null,
        districtId: null,
        address: null,
        avatarUrl: null,
        role: "user",
        passportPhotos: null,
        driverLicensePhotos: null,
    };

    return (
        <ProfileForm
            user={emptyUser}
            countries={countries}
            hotels={hotels}
            locations={locations}
            districts={districts}
            isEdit={true}
        />
    );
}
