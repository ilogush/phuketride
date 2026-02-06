import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
    index("routes/home.tsx"),
    route("login", "routes/login.tsx"),
    route("register", "routes/register.tsx"),
    route("logout", "routes/logout.tsx"),

    // Dashboard with layout
    layout("routes/dashboard.tsx", [
        route("dashboard", "routes/dashboard._index.tsx"),

        // Admin routes
        route("dashboard/companies", "routes/dashboard.companies.tsx"),
        route("dashboard/users", "routes/dashboard.users.tsx"),
        route("dashboard/cars", "routes/dashboard.cars.tsx"),
        route("dashboard/payments", "routes/dashboard.payments.tsx"),
        route("dashboard/locations", "routes/dashboard.locations.tsx"),
        route("dashboard/hotels", "routes/dashboard.hotels.tsx"),
        route("dashboard/durations", "routes/dashboard.durations.tsx"),
        route("dashboard/seasons", "routes/dashboard.seasons.tsx"),
        route("dashboard/colors", "routes/dashboard.colors.tsx"),
        route("dashboard/admin/audit-logs", "routes/dashboard.admin.audit-logs.tsx"),

        // Partner/Manager routes
        route("dashboard/contracts", "routes/dashboard.contracts.tsx"),
        route("dashboard/calendar", "routes/dashboard.calendar.tsx"),
        route("dashboard/chat", "routes/dashboard.chat.tsx"),
        route("dashboard/settings", "routes/dashboard.settings.tsx"),
        route("dashboard/bookings", "routes/dashboard.bookings.tsx"),
        route("dashboard/profile", "routes/dashboard.profile.tsx"),

        // User routes
        route("dashboard/search-cars", "routes/dashboard.search-cars.tsx"),
        route("dashboard/my-bookings", "routes/dashboard.my-bookings.tsx"),
        route("dashboard/my-contracts", "routes/dashboard.my-contracts.tsx"),
    ]),
] satisfies RouteConfig;
