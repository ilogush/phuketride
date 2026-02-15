import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("register-partner", "routes/register-partner.tsx"),
    route("logout", "routes/logout.tsx"),
    
    // R2 assets route
    route("assets/*", "routes/assets.$.tsx"),

    // Company standalone dashboard (Phuket Ride Co.)
    route("companies/:companyId", "routes/companies.$companyId.tsx"),

    // Compatibility redirects for legacy /dashboard/* URLs
    route("dashboard/*", "routes/dashboard.redirect.tsx"),

    // Protected routes with dashboard layout
    layout("routes/dashboard.tsx", [
        route("dashboard", "routes/dashboard._index.tsx"),

        // Admin routes
        route("companies", "routes/dashboard.companies.tsx"),
        route("companies/create", "routes/dashboard.companies.create.tsx"),
        route("companies/:companyId", "routes/dashboard.companies.$companyId.tsx"),
        route("companies/:companyId/edit", "routes/dashboard.companies.edit.tsx"),
        route("users", "routes/dashboard.users.tsx"),
        route("users/create", "routes/dashboard.users.create.tsx"),
        route("users/:userId", "routes/dashboard.users.$userId.tsx"),
        route("users/:userId/edit", "routes/dashboard.users.$userId.edit.tsx"),
        route("cars", "routes/dashboard.cars.tsx"),
        route("cars/create", "routes/dashboard.cars.create.tsx"),
        route("cars/:id", "routes/dashboard.cars.$id.tsx"),
        route("cars/:id/edit", "routes/dashboard.cars.$id.edit.tsx"),
        route("brands", "routes/dashboard.brands.tsx"),
        route("brands/create", "routes/dashboard.brands.create.tsx"),
        route("models", "routes/dashboard.models.tsx"),
        route("models/create", "routes/dashboard.models.create.tsx"),
        route("car-templates", "routes/dashboard.car-templates.tsx"),
        route("car-templates/create", "routes/dashboard.car-templates.create.tsx"),
        route("car-templates/:id", "routes/dashboard.car-templates.$id.tsx"),
        route("car-templates/:id/edit", "routes/dashboard.car-templates.$id.edit.tsx"),
        route("payments", "routes/dashboard.payments.tsx"),
        route("payments/create", "routes/dashboard.payments.create.tsx"),
        route("payment-statuses", "routes/dashboard.payment-statuses.tsx"),
        route("locations", "routes/dashboard.locations.tsx"),
        route("districts", "routes/dashboard.districts.tsx"),
        route("hotels", "routes/dashboard.hotels.tsx"),
        route("durations", "routes/dashboard.durations.tsx"),
        route("seasons", "routes/dashboard.seasons.tsx"),
        // Colors with nested modal routes
        route("colors", "routes/dashboard.colors.tsx", [
            route("new", "routes/dashboard.colors_.new.tsx"),
            route(":colorId/edit", "routes/dashboard.colors_.$colorId.edit.tsx"),
        ]),
        route("reports", "routes/dashboard.reports.tsx"),
        route("logs", "routes/dashboard.logs.tsx"),

        // Partner/Manager routes
        route("contracts", "routes/dashboard.contracts.tsx", [
            route(":id/close", "routes/dashboard.contracts_.$id.close.tsx"),
        ]),
        route("contracts/new", "routes/dashboard.contracts.new.tsx"),
        route("contracts/:id", "routes/dashboard.contracts.$id.tsx"),
        route("contracts/:id/edit", "routes/dashboard.contracts.$id.edit.tsx"),
        route("calendar", "routes/dashboard.calendar.tsx", [
            route("new", "routes/dashboard.calendar.new.tsx"),
        ]),
        route("settings", "routes/dashboard.settings.tsx"),
        route("bookings", "routes/dashboard.bookings.tsx"),
        route("bookings/create", "routes/dashboard.bookings.create.tsx"),
        route("bookings/:id", "routes/dashboard.bookings.$id.tsx"),
        route("profile", "routes/dashboard.profile.tsx"),
        route("profile/edit", "routes/dashboard.profile.edit.tsx"),

        // User routes
        route("search-cars", "routes/dashboard.search-cars.tsx"),
        route("my-bookings", "routes/dashboard.my-bookings.tsx"),
        route("my-contracts", "routes/dashboard.my-contracts.tsx"),
        route("my-contracts/:id", "routes/dashboard.my-contracts.$id.tsx"),
        route("my-payments", "routes/dashboard.my-payments.tsx"),
        route("notifications", "routes/dashboard.notifications.tsx"),
    ]),
] satisfies RouteConfig;
