import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("register-partner", "routes/register-partner.tsx"),
    route("logout", "routes/logout.tsx"),

    // R2 assets route
    route("assets/*", "routes/assets.$.tsx"),
    route("become-a-host", "routes/become-a-host.tsx"),
    route("why-choose-phuket-ride", "routes/why-choose-phuket-ride.tsx"),
    route("gift-cards", "routes/gift-cards.tsx"),
    route("contact-support", "routes/contact-support.tsx"),
    route("legal", "routes/legal.tsx"),
    route("insurance-protection", "routes/insurance-protection.tsx"),
    route("host-tools", "routes/host-tools.tsx"),
    route("carculator", "routes/carculator.tsx"),

    // Public company fleet page
    route("company/:slug", "routes/company.$slug.tsx"),
    route("cars/:id", "routes/cars.$id.tsx"),
    route("cars/:id/checkout", "routes/cars.$id.checkout.tsx"),
    // Protected routes with dashboard layout (root admin URLs)
    layout("routes/app-layout.tsx", [
        route("home", "routes/dashboard-home.tsx"),

        // Admin routes
        route("companies", "routes/companies.tsx"),
        route("companies/create", "routes/companies.create.tsx"),
        route("companies/:companyId", "routes/admin-companies.$companyId.tsx"),
        route("companies/:companyId/edit", "routes/companies.edit.tsx"),
        route("users", "routes/users.tsx"),
        route("users/create", "routes/users.create.tsx"),
        route("users/:userId", "routes/users.$userId.tsx"),
        route("users/:userId/edit", "routes/users.$userId.edit.tsx"),
        route("cars", "routes/cars.tsx"),
        route("cars/create", "routes/cars.create.tsx"),
        route("cars/:id", "routes/admin-cars.$id.tsx"),
        route("cars/:id/edit", "routes/cars.$id.edit.tsx"),
        route("brands", "routes/brands.tsx"),
        route("brands/create", "routes/brands.create.tsx"),
        route("models", "routes/models.tsx"),
        route("models/create", "routes/models.create.tsx"),
        route("car-templates", "routes/car-templates.tsx"),
        route("car-templates/create", "routes/car-templates.create.tsx"),
        route("car-templates/:id", "routes/car-templates.$id.tsx"),
        route("car-templates/:id/edit", "routes/car-templates.$id.edit.tsx"),
        route("payments", "routes/payments.tsx"),
        route("payments/create", "routes/payments.create.tsx"),
        route("payment-statuses", "routes/payment-statuses.tsx"),
        route("locations", "routes/locations.tsx"),
        route("districts", "routes/districts.tsx"),
        route("hotels", "routes/hotels.tsx"),
        route("durations", "routes/durations.tsx"),
        route("seasons", "routes/seasons.tsx"),
        // Colors with nested modal routes
        route("colors", "routes/colors.tsx", [
            route("new", "routes/colors_.new.tsx"),
            route(":colorId/edit", "routes/colors_.$colorId.edit.tsx"),
        ]),
        route("reports", "routes/reports.tsx"),
        route("logs", "routes/logs.tsx"),

        // Partner/Manager routes
        route("contracts", "routes/contracts.tsx", [
            route(":id/close", "routes/contracts_.$id.close.tsx"),
        ]),
        route("contracts/new", "routes/contracts.new.tsx"),
        route("contracts/:id", "routes/contracts.$id.tsx"),
        route("contracts/:id/edit", "routes/contracts.$id.edit.tsx"),
        route("calendar", "routes/calendar.tsx", [
            route("new", "routes/calendar.new.tsx"),
        ]),
        route("settings", "routes/settings.tsx"),
        route("bookings", "routes/bookings.tsx"),
        route("bookings/create", "routes/bookings.create.tsx"),
        route("bookings/:id", "routes/bookings.$id.tsx"),
        route("profile", "routes/profile.tsx"),
        route("profile/edit", "routes/profile.edit.tsx"),

        // User routes
        route("search-cars", "routes/search-cars.tsx"),
        route("my-bookings", "routes/my-bookings.tsx"),
        route("my-contracts", "routes/my-contracts.tsx"),
        route("my-contracts/:id", "routes/my-contracts.$id.tsx"),
        route("my-payments", "routes/my-payments.tsx"),
        route("notifications", "routes/notifications.tsx"),
    ]),
] satisfies RouteConfig;
