import { sqliteTable, text, integer, real, index as sqliteIndex } from "drizzle-orm/sqlite-core";

// Users table - extends auth system
export const users = sqliteTable("users", {
    id: text("id").primaryKey(), // UUID from auth system
    email: text("email").notNull().unique(),
    role: text("role", { enum: ["admin", "partner", "manager", "user"] }).notNull(),
    name: text("name"),
    surname: text("surname"),
    phone: text("phone"),
    whatsapp: text("whatsapp"),
    telegram: text("telegram"),
    passportNumber: text("passport_number"),
    citizenship: text("citizenship"),
    city: text("city"),
    countryId: integer("country_id"),
    dateOfBirth: integer("date_of_birth", { mode: "timestamp" }),
    gender: text("gender", { enum: ["male", "female", "other"] }),
    passportPhotos: text("passport_photos"), // JSON array
    driverLicensePhotos: text("driver_license_photos"), // JSON array
    passwordHash: text("password_hash"),
    avatarUrl: text("avatar_url"),
    hotelId: integer("hotel_id"),
    roomNumber: text("room_number"),
    locationId: integer("location_id"),
    districtId: integer("district_id"),
    address: text("address"),
    isFirstLogin: integer("is_first_login", { mode: "boolean" }).default(true),
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    emailIdx: sqliteIndex("idx_users_email").on(table.email),
    roleIdx: sqliteIndex("idx_users_role").on(table.role),
    archivedIdx: sqliteIndex("idx_users_archived_at").on(table.archivedAt),
}));

// Companies table
export const companies = sqliteTable("companies", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(), // FK to users
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    telegram: text("telegram"),
    locationId: integer("location_id").notNull(),
    districtId: integer("district_id").notNull(),
    street: text("street").notNull(),
    houseNumber: text("house_number").notNull(),
    address: text("address"),
    // Bank Details
    bankName: text("bank_name"),
    accountNumber: text("account_number"),
    accountName: text("account_name"),
    swiftCode: text("swift_code"),
    // Booking Settings
    preparationTime: integer("preparation_time").default(30), // minutes
    deliveryFeeAfterHours: real("delivery_fee_after_hours").default(0),
    islandTripPrice: real("island_trip_price"),
    krabiTripPrice: real("krabi_trip_price"),
    babySeatPricePerDay: real("baby_seat_price_per_day"),
    // Schedule & Holidays stored in JSON
    weeklySchedule: text("weekly_schedule"), // JSON: {monday: {open: true, start: "08:00", end: "20:00"}, ...}
    holidays: text("holidays"), // JSON: ["2024-01-01", "2024-12-25", ...]
    settings: text("settings"), // JSON for other settings
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    ownerIdx: sqliteIndex("idx_companies_owner_id").on(table.ownerId),
    locationIdx: sqliteIndex("idx_companies_location_id").on(table.locationId),
    archivedIdx: sqliteIndex("idx_companies_archived_at").on(table.archivedAt),
}));

// Managers table
export const managers = sqliteTable("managers", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(), // FK to users
    companyId: integer("company_id").notNull(), // FK to companies
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    userIdx: sqliteIndex("idx_managers_user_id").on(table.userId),
    companyIdx: sqliteIndex("idx_managers_company_id").on(table.companyId),
}));

// Reference tables
export const countries = sqliteTable("countries", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const locations = sqliteTable("locations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    countryId: integer("country_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const districts = sqliteTable("districts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    locationId: integer("location_id").notNull(),
    beaches: text("beaches"), // JSON array of beach/location names
    streets: text("streets"), // JSON array of main streets/roads
    isActive: integer("is_active", { mode: "boolean" }).default(false),
    deliveryPrice: real("delivery_price").default(0),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Hotels table
export const hotels = sqliteTable("hotels", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    locationId: integer("location_id").notNull(),
    districtId: integer("district_id").notNull(),
    address: text("address"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    locationIdx: sqliteIndex("idx_hotels_location_id").on(table.locationId),
    districtIdx: sqliteIndex("idx_hotels_district_id").on(table.districtId),
}));

export const carBrands = sqliteTable("car_brands", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    logoUrl: text("logo_url"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const carModels = sqliteTable("car_models", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    brandId: integer("brand_id").notNull(),
    name: text("name").notNull(),
    bodyTypeId: integer("body_type_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const colors = sqliteTable("colors", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    hexCode: text("hex_code"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const bodyTypes = sqliteTable("body_types", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const fuelTypes = sqliteTable("fuel_types", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Car templates table
export const carTemplates = sqliteTable("car_templates", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    brandId: integer("brand_id").notNull(),
    modelId: integer("model_id").notNull(),
    productionYear: integer("production_year"),
    transmission: text("transmission", { enum: ["automatic", "manual"] }),
    engineVolume: real("engine_volume"),
    bodyTypeId: integer("body_type_id"),
    seats: integer("seats"),
    doors: integer("doors"),
    fuelTypeId: integer("fuel_type_id"),
    description: text("description"),
    photos: text("photos"), // JSON array
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Company cars table
export const companyCars = sqliteTable("company_cars", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id").notNull(),
    templateId: integer("template_id"),
    colorId: integer("color_id"),
    licensePlate: text("license_plate").notNull(),
    vin: text("vin"),
    year: integer("year"),
    transmission: text("transmission"),
    engineVolume: real("engine_volume"),
    fuelTypeId: integer("fuel_type_id"),
    pricePerDay: real("price_per_day").default(0),
    deposit: real("deposit").default(0),
    minInsurancePrice: real("min_insurance_price"),
    maxInsurancePrice: real("max_insurance_price"),
    fullInsuranceMinPrice: real("full_insurance_min_price"),
    fullInsuranceMaxPrice: real("full_insurance_max_price"),
    mileage: integer("mileage").default(0),
    nextOilChangeMileage: integer("next_oil_change_mileage"),
    oilChangeInterval: integer("oil_change_interval").default(10000),
    insuranceExpiryDate: integer("insurance_expiry_date", { mode: "timestamp" }),
    taxRoadExpiryDate: integer("tax_road_expiry_date", { mode: "timestamp" }),
    registrationExpiry: integer("registration_expiry", { mode: "timestamp" }),
    insuranceType: text("insurance_type"),
    status: text("status", { enum: ["available", "maintenance", "rented", "booked"] }).default("available"),
    photos: text("photos"), // JSON array - max 12
    documentPhotos: text("document_photos"), // JSON array
    greenBookPhotos: text("green_book_photos"), // JSON array - max 3
    insurancePhotos: text("insurance_photos"), // JSON array - max 3
    taxRoadPhotos: text("tax_road_photos"), // JSON array - max 3
    description: text("description"),
    marketingHeadline: text("marketing_headline"),
    featuredImageIndex: integer("featured_image_index").default(0),
    seasonalPrices: text("seasonal_prices"), // JSON array
    archivedAt: integer("archived_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Contracts table
export const contracts = sqliteTable("contracts", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyCarId: integer("company_car_id").notNull(),
    clientId: text("client_id").notNull(), // FK to users
    managerId: text("manager_id"), // FK to users
    bookingId: integer("booking_id"),
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }).notNull(),
    actualEndDate: integer("actual_end_date", { mode: "timestamp" }),
    totalAmount: real("total_amount").notNull(),
    totalCurrency: text("total_currency").default("THB"),
    depositAmount: real("deposit_amount"),
    depositCurrency: text("deposit_currency").default("THB"),
    depositPaymentMethod: text("deposit_payment_method", { enum: ["cash", "bank_transfer", "card"] }),
    fullInsuranceEnabled: integer("full_insurance_enabled", { mode: "boolean" }).default(false),
    fullInsurancePrice: real("full_insurance_price").default(0),
    babySeatEnabled: integer("baby_seat_enabled", { mode: "boolean" }).default(false),
    babySeatPrice: real("baby_seat_price").default(0),
    islandTripEnabled: integer("island_trip_enabled", { mode: "boolean" }).default(false),
    islandTripPrice: real("island_trip_price").default(0),
    krabiTripEnabled: integer("krabi_trip_enabled", { mode: "boolean" }).default(false),
    krabiTripPrice: real("krabi_trip_price").default(0),
    pickupDistrictId: integer("pickup_district_id"),
    pickupHotel: text("pickup_hotel"),
    pickupRoom: text("pickup_room"),
    deliveryCost: real("delivery_cost").default(0),
    returnDistrictId: integer("return_district_id"),
    returnHotel: text("return_hotel"),
    returnRoom: text("return_room"),
    returnCost: real("return_cost").default(0),
    startMileage: integer("start_mileage"),
    endMileage: integer("end_mileage"),
    fuelLevel: text("fuel_level").default("full"),
    cleanliness: text("cleanliness").default("clean"),
    status: text("status", { enum: ["active", "closed"] }).default("active"),
    photos: text("photos"), // JSON array
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Bookings table
export const bookings = sqliteTable("bookings", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyCarId: integer("company_car_id").notNull(),
    clientId: text("client_id").notNull(), // FK to users
    managerId: text("manager_id"), // FK to users
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }).notNull(),
    estimatedAmount: real("estimated_amount").notNull(),
    currency: text("currency").default("THB"),
    depositAmount: real("deposit_amount").default(0),
    depositPaid: integer("deposit_paid", { mode: "boolean" }).default(false),
    depositPaymentMethod: text("deposit_payment_method", { enum: ["cash", "bank_transfer", "card"] }),
    // Client details
    clientName: text("client_name").notNull(),
    clientSurname: text("client_surname").notNull(),
    clientPhone: text("client_phone").notNull(),
    clientEmail: text("client_email"),
    clientPassport: text("client_passport"),
    // Pickup/Return
    pickupDistrictId: integer("pickup_district_id"),
    pickupHotel: text("pickup_hotel"),
    pickupRoom: text("pickup_room"),
    deliveryCost: real("delivery_cost").default(0),
    returnDistrictId: integer("return_district_id"),
    returnHotel: text("return_hotel"),
    returnRoom: text("return_room"),
    returnCost: real("return_cost").default(0),
    // Extras
    fullInsuranceEnabled: integer("full_insurance_enabled", { mode: "boolean" }).default(false),
    fullInsurancePrice: real("full_insurance_price").default(0),
    babySeatEnabled: integer("baby_seat_enabled", { mode: "boolean" }).default(false),
    babySeatPrice: real("baby_seat_price").default(0),
    islandTripEnabled: integer("island_trip_enabled", { mode: "boolean" }).default(false),
    islandTripPrice: real("island_trip_price").default(0),
    krabiTripEnabled: integer("krabi_trip_enabled", { mode: "boolean" }).default(false),
    krabiTripPrice: real("krabi_trip_price").default(0),
    status: text("status", { enum: ["pending", "confirmed", "converted", "cancelled"] }).default("pending"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Currencies table
export const currencies = sqliteTable("currencies", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    code: text("code").notNull().unique(),
    name: text("name").notNull(),
    symbol: text("symbol").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    companyId: integer("company_id"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
}, (table) => ({
    companyIdx: sqliteIndex("idx_currencies_company_id").on(table.companyId),
    isActiveIdx: sqliteIndex("idx_currencies_is_active").on(table.isActive),
}));

// Payment types table
export const paymentTypes = sqliteTable("payment_types", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull().unique(),
    sign: text("sign", { enum: ["+", "-"] }),
    description: text("description"),
    companyId: integer("company_id"),
    isSystem: integer("is_system", { mode: "boolean" }).default(false),
    isActive: integer("is_active", { mode: "boolean" }).default(true),
    showOnCreate: integer("show_on_create", { mode: "boolean" }).default(false),
    showOnClose: integer("show_on_close", { mode: "boolean" }).default(false),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Payments table
export const payments = sqliteTable("payments", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    contractId: integer("contract_id").notNull(),
    paymentTypeId: integer("payment_type_id").notNull(),
    amount: real("amount").notNull(),
    currencyId: integer("currency_id"),
    currency: text("currency").default("THB"), // Legacy field
    paymentMethod: text("payment_method", { enum: ["cash", "bank_transfer", "card"] }),
    status: text("status", { enum: ["pending", "completed", "cancelled"] }).default("completed"),
    notes: text("notes"),
    createdBy: text("created_by"), // FK to users
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Maintenance history table
export const maintenanceHistory = sqliteTable("maintenance_history", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyCarId: integer("company_car_id").notNull(),
    maintenanceType: text("maintenance_type", {
        enum: ["oil_change", "tire_change", "brake_service", "general_service", "repair", "inspection", "other"]
    }).notNull(),
    mileage: integer("mileage"),
    cost: real("cost"),
    notes: text("notes"),
    performedAt: integer("performed_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    performedBy: text("performed_by"), // FK to users
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Calendar events table
export const calendarEvents = sqliteTable("calendar_events", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    companyId: integer("company_id").notNull(),
    eventType: text("event_type", {
        enum: ["contract", "booking", "payment_due", "payout_due", "maintenance",
            "document_expiry", "general", "meeting", "delivery", "pickup", "other"]
    }).notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startDate: integer("start_date", { mode: "timestamp" }).notNull(),
    endDate: integer("end_date", { mode: "timestamp" }),
    relatedId: integer("related_id"),
    color: text("color").default("#3B82F6"),
    status: text("status", { enum: ["pending", "completed", "cancelled"] }).default("pending"),
    notificationSent: integer("notification_sent", { mode: "boolean" }).default(false),
    createdBy: text("created_by"), // FK to users
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Audit logs table
export const auditLogs = sqliteTable("audit_logs", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id"),
    role: text("role"),
    companyId: integer("company_id"),
    entityType: text("entity_type").notNull(),
    entityId: integer("entity_id"),
    action: text("action", { enum: ["create", "update", "delete", "view", "export", "clear"] }).notNull(),
    beforeState: text("before_state"), // JSON
    afterState: text("after_state"), // JSON
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Admin settings table
export const adminSettings = sqliteTable("admin_settings", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    key: text("key").notNull().unique(),
    value: text("value").notNull(), // JSON
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Rental durations table
export const rentalDurations = sqliteTable("rental_durations", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    rangeName: text("range_name").notNull(),
    minDays: integer("min_days").notNull(),
    maxDays: integer("max_days"), // null = unlimited
    priceMultiplier: real("price_multiplier").notNull().default(1),
    discountLabel: text("discount_label"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

// Seasons table
export const seasons = sqliteTable("seasons", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    seasonName: text("season_name").notNull(),
    startMonth: integer("start_month").notNull(), // 1-12
    startDay: integer("start_day").notNull(), // 1-31
    endMonth: integer("end_month").notNull(), // 1-12
    endDay: integer("end_day").notNull(), // 1-31
    priceMultiplier: real("price_multiplier").notNull().default(1),
    discountLabel: text("discount_label"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});


// Indexes for performance optimization

// Users indexes
export const usersEmailIdx = sqliteIndex("idx_users_email").on(users.email);
export const usersRoleIdx = sqliteIndex("idx_users_role").on(users.role);

// Companies indexes
export const companiesOwnerIdx = sqliteIndex("idx_companies_owner_id").on(companies.ownerId);
export const companiesLocationIdx = sqliteIndex("idx_companies_location_id").on(companies.locationId);

// Managers indexes
export const managersUserIdx = sqliteIndex("idx_managers_user_id").on(managers.userId);
export const managersCompanyIdx = sqliteIndex("idx_managers_company_id").on(managers.companyId);

// Company cars indexes
export const companyCarsCompanyIdx = sqliteIndex("idx_company_cars_company_id").on(companyCars.companyId);
export const companyCarsStatusIdx = sqliteIndex("idx_company_cars_status").on(companyCars.status);
export const companyCarsCompanyStatusIdx = sqliteIndex("idx_cars_company_status").on(companyCars.companyId, companyCars.status);
export const companyCarsTemplateCompanyIdx = sqliteIndex("idx_cars_template_company").on(companyCars.templateId, companyCars.companyId);

// Contracts indexes
export const contractsClientIdx = sqliteIndex("idx_contracts_client_id").on(contracts.clientId);
export const contractsCompanyCarIdx = sqliteIndex("idx_contracts_company_car_id").on(contracts.companyCarId);
export const contractsStatusIdx = sqliteIndex("idx_contracts_status").on(contracts.status);
export const contractsCompanyDatesIdx = sqliteIndex("idx_contracts_company_dates").on(contracts.companyCarId, contracts.startDate, contracts.endDate);

// Bookings indexes
export const bookingsClientIdx = sqliteIndex("idx_bookings_client_id").on(bookings.clientId);
export const bookingsCompanyCarIdx = sqliteIndex("idx_bookings_company_car_id").on(bookings.companyCarId);
export const bookingsStatusIdx = sqliteIndex("idx_bookings_status").on(bookings.status);
export const bookingsCompanyDatesIdx = sqliteIndex("idx_bookings_company_dates").on(bookings.companyCarId, bookings.startDate, bookings.endDate);
export const contractsStatusCompanyIdx = sqliteIndex("idx_contracts_status_company").on(contracts.status, contracts.companyCarId);

// Payments indexes
export const paymentsContractIdx = sqliteIndex("idx_payments_contract_id").on(payments.contractId);
export const paymentsCreatedAtIdx = sqliteIndex("idx_payments_created_at").on(payments.createdAt);
export const paymentsStatusIdx = sqliteIndex("idx_payments_status").on(payments.status);

// Payment types indexes
export const paymentTypesCompanyIdx = sqliteIndex("idx_payment_types_company_id").on(paymentTypes.companyId);
export const paymentTypesSystemIdx = sqliteIndex("idx_payment_types_is_system").on(paymentTypes.isSystem);

// Maintenance history indexes
export const maintenanceHistoryCarIdx = sqliteIndex("idx_maintenance_history_car_id").on(maintenanceHistory.companyCarId);
export const maintenanceHistoryPerformedAtIdx = sqliteIndex("idx_maintenance_history_performed_at").on(maintenanceHistory.performedAt);

// Calendar events indexes
export const calendarEventsCompanyIdx = sqliteIndex("idx_calendar_events_company_id").on(calendarEvents.companyId);
export const calendarEventsStartDateIdx = sqliteIndex("idx_calendar_events_start_date").on(calendarEvents.startDate);
export const calendarEventsEventTypeIdx = sqliteIndex("idx_calendar_events_event_type").on(calendarEvents.eventType);
export const calendarEventsStatusIdx = sqliteIndex("idx_calendar_events_status").on(calendarEvents.status);

// Audit logs indexes
export const auditLogsUserIdx = sqliteIndex("idx_audit_logs_user_id").on(auditLogs.userId);
export const auditLogsCompanyIdx = sqliteIndex("idx_audit_logs_company_id").on(auditLogs.companyId);
export const auditLogsEntityTypeIdx = sqliteIndex("idx_audit_logs_entity_type").on(auditLogs.entityType);
export const auditLogsCreatedAtIdx = sqliteIndex("idx_audit_logs_created_at").on(auditLogs.createdAt);


// ============================================
// RELATIONS (for Drizzle ORM queries with .with())
// ============================================

import { relations } from "drizzle-orm";

// Users relations
export const usersRelations = relations(users, ({ one, many }) => ({
    // User as company owner
    ownedCompany: one(companies, {
        fields: [users.id],
        references: [companies.ownerId],
    }),
    // User as manager
    managerProfile: one(managers, {
        fields: [users.id],
        references: [managers.userId],
    }),
    // User as client in contracts
    clientContracts: many(contracts, {
        relationName: "clientContracts",
    }),
    // User as manager in contracts
    managedContracts: many(contracts, {
        relationName: "managedContracts",
    }),
    // User as client in bookings
    clientBookings: many(bookings, {
        relationName: "clientBookings",
    }),
    // User as manager in bookings
    managedBookings: many(bookings, {
        relationName: "managedBookings",
    }),
    // User as payment creator
    createdPayments: many(payments),
}));

// Companies relations
export const companiesRelations = relations(companies, ({ one, many }) => ({
    // Company owner
    owner: one(users, {
        fields: [companies.ownerId],
        references: [users.id],
    }),
    // Company cars
    cars: many(companyCars),
    // Company managers
    managers: many(managers),
    // Company payment types
    paymentTypes: many(paymentTypes),
    // Company currencies
    currencies: many(currencies),
    // Company calendar events
    calendarEvents: many(calendarEvents),
}));

// Managers relations
export const managersRelations = relations(managers, ({ one }) => ({
    user: one(users, {
        fields: [managers.userId],
        references: [users.id],
    }),
    company: one(companies, {
        fields: [managers.companyId],
        references: [companies.id],
    }),
}));

// Car templates relations
export const carTemplatesRelations = relations(carTemplates, ({ one, many }) => ({
    brand: one(carBrands, {
        fields: [carTemplates.brandId],
        references: [carBrands.id],
    }),
    model: one(carModels, {
        fields: [carTemplates.modelId],
        references: [carModels.id],
    }),
    bodyType: one(bodyTypes, {
        fields: [carTemplates.bodyTypeId],
        references: [bodyTypes.id],
    }),
    fuelType: one(fuelTypes, {
        fields: [carTemplates.fuelTypeId],
        references: [fuelTypes.id],
    }),
    // Cars created from this template
    companyCars: many(companyCars),
}));

// Company cars relations
export const companyCarsRelations = relations(companyCars, ({ one, many }) => ({
    company: one(companies, {
        fields: [companyCars.companyId],
        references: [companies.id],
    }),
    template: one(carTemplates, {
        fields: [companyCars.templateId],
        references: [carTemplates.id],
    }),
    color: one(colors, {
        fields: [companyCars.colorId],
        references: [colors.id],
    }),
    fuelType: one(fuelTypes, {
        fields: [companyCars.fuelTypeId],
        references: [fuelTypes.id],
    }),
    // Contracts for this car
    contracts: many(contracts),
    // Maintenance history
    maintenanceHistory: many(maintenanceHistory),
}));

// Contracts relations
export const contractsRelations = relations(contracts, ({ one, many }) => ({
    companyCar: one(companyCars, {
        fields: [contracts.companyCarId],
        references: [companyCars.id],
    }),
    client: one(users, {
        fields: [contracts.clientId],
        references: [users.id],
        relationName: "clientContracts",
    }),
    manager: one(users, {
        fields: [contracts.managerId],
        references: [users.id],
        relationName: "managedContracts",
    }),
    booking: one(bookings, {
        fields: [contracts.bookingId],
        references: [bookings.id],
    }),
    pickupDistrict: one(districts, {
        fields: [contracts.pickupDistrictId],
        references: [districts.id],
    }),
    returnDistrict: one(districts, {
        fields: [contracts.returnDistrictId],
        references: [districts.id],
    }),
    // Payments for this contract
    payments: many(payments),
}));

// Bookings relations
export const bookingsRelations = relations(bookings, ({ one }) => ({
    companyCar: one(companyCars, {
        fields: [bookings.companyCarId],
        references: [companyCars.id],
    }),
    client: one(users, {
        fields: [bookings.clientId],
        references: [users.id],
        relationName: "clientBookings",
    }),
    manager: one(users, {
        fields: [bookings.managerId],
        references: [users.id],
        relationName: "managedBookings",
    }),
    pickupDistrict: one(districts, {
        fields: [bookings.pickupDistrictId],
        references: [districts.id],
    }),
    returnDistrict: one(districts, {
        fields: [bookings.returnDistrictId],
        references: [districts.id],
    }),
}));

// Payments relations
export const paymentsRelations = relations(payments, ({ one }) => ({
    contract: one(contracts, {
        fields: [payments.contractId],
        references: [contracts.id],
    }),
    paymentType: one(paymentTypes, {
        fields: [payments.paymentTypeId],
        references: [paymentTypes.id],
    }),
    currency: one(currencies, {
        fields: [payments.currencyId],
        references: [currencies.id],
    }),
    creator: one(users, {
        fields: [payments.createdBy],
        references: [users.id],
    }),
}));

// Currencies relations
export const currenciesRelations = relations(currencies, ({ one, many }) => ({
    company: one(companies, {
        fields: [currencies.companyId],
        references: [companies.id],
    }),
    payments: many(payments),
}));

// Payment types relations
export const paymentTypesRelations = relations(paymentTypes, ({ one, many }) => ({
    company: one(companies, {
        fields: [paymentTypes.companyId],
        references: [companies.id],
    }),
    payments: many(payments),
}));

// Maintenance history relations
export const maintenanceHistoryRelations = relations(maintenanceHistory, ({ one }) => ({
    companyCar: one(companyCars, {
        fields: [maintenanceHistory.companyCarId],
        references: [companyCars.id],
    }),
    performedBy: one(users, {
        fields: [maintenanceHistory.performedBy],
        references: [users.id],
    }),
}));

// Car brands relations
export const carBrandsRelations = relations(carBrands, ({ many }) => ({
    models: many(carModels),
    templates: many(carTemplates),
}));

// Car models relations
export const carModelsRelations = relations(carModels, ({ one, many }) => ({
    brand: one(carBrands, {
        fields: [carModels.brandId],
        references: [carBrands.id],
    }),
    bodyType: one(bodyTypes, {
        fields: [carModels.bodyTypeId],
        references: [bodyTypes.id],
    }),
    templates: many(carTemplates),
}));

// Colors relations
export const colorsRelations = relations(colors, ({ many }) => ({
    companyCars: many(companyCars),
}));

// Body types relations
export const bodyTypesRelations = relations(bodyTypes, ({ many }) => ({
    models: many(carModels),
    templates: many(carTemplates),
}));

// Fuel types relations
export const fuelTypesRelations = relations(fuelTypes, ({ many }) => ({
    templates: many(carTemplates),
    companyCars: many(companyCars),
}));

// Districts relations
export const districtsRelations = relations(districts, ({ one, many }) => ({
    location: one(locations, {
        fields: [districts.locationId],
        references: [locations.id],
    }),
    hotels: many(hotels),
    pickupContracts: many(contracts),
    returnContracts: many(contracts),
}));

// Locations relations
export const locationsRelations = relations(locations, ({ one, many }) => ({
    country: one(countries, {
        fields: [locations.countryId],
        references: [countries.id],
    }),
    districts: many(districts),
    hotels: many(hotels),
}));

// Countries relations
export const countriesRelations = relations(countries, ({ many }) => ({
    locations: many(locations),
}));

// Hotels relations
export const hotelsRelations = relations(hotels, ({ one }) => ({
    location: one(locations, {
        fields: [hotels.locationId],
        references: [locations.id],
    }),
    district: one(districts, {
        fields: [hotels.districtId],
        references: [districts.id],
    }),
}));

// Calendar events relations
export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
    company: one(companies, {
        fields: [calendarEvents.companyId],
        references: [companies.id],
    }),
    creator: one(users, {
        fields: [calendarEvents.createdBy],
        references: [users.id],
    }),
}));

// Rental durations relations (global, no company relation)
export const rentalDurationsRelations = relations(rentalDurations, () => ({}));

// Seasons relations (global, no company relation)
export const seasonsRelations = relations(seasons, () => ({}));
