import { drizzle } from "drizzle-orm/d1";
import * as schema from "../app/db/schema";

/**
 * Seed test data for all tables
 * Run with: npm run db:seed
 */

export async function seedTestData(db: any) {
    console.log("🌱 Starting seed process...");

    try {
        // 1. Countries
        console.log("📍 Seeding countries...");
        const countriesData = [
            { name: "Thailand", code: "TH" },
            { name: "Russia", code: "RU" },
            { name: "United States", code: "US" },
        ];
        await db.insert(schema.countries).values(countriesData).onConflictDoNothing();

        // 2. Locations
        console.log("🗺️  Seeding locations...");
        const locationsData = [
            { name: "Phuket", countryId: 1 },
            { name: "Bangkok", countryId: 1 },
            { name: "Krabi", countryId: 1 },
        ];
        await db.insert(schema.locations).values(locationsData).onConflictDoNothing();

        // 3. Districts
        console.log("🏘️  Seeding districts...");
        const districtsData = [
            { name: "Patong", locationId: 1, deliveryPrice: 300 },
            { name: "Kata", locationId: 1, deliveryPrice: 400 },
            { name: "Karon", locationId: 1, deliveryPrice: 350 },
            { name: "Rawai", locationId: 1, deliveryPrice: 500 },
            { name: "Chalong", locationId: 1, deliveryPrice: 450 },
        ];
        await db.insert(schema.districts).values(districtsData).onConflictDoNothing();

        // 4. Car Brands
        console.log("🚗 Seeding car brands...");
        const brandsData = [
            { name: "Honda", logoUrl: null },
            { name: "Toyota", logoUrl: null },
            { name: "Yamaha", logoUrl: null },
            { name: "Suzuki", logoUrl: null },
        ];
        await db.insert(schema.carBrands).values(brandsData).onConflictDoNothing();

        // 5. Car Models
        console.log("🏎️  Seeding car models...");
        const modelsData = [
            { brandId: 1, name: "PCX 160", bodyType: "scooter" },
            { brandId: 1, name: "Click 160", bodyType: "scooter" },
            { brandId: 2, name: "Fortuner", bodyType: "suv" },
            { brandId: 2, name: "Yaris", bodyType: "sedan" },
            { brandId: 3, name: "Aerox 155", bodyType: "scooter" },
        ];
        await db.insert(schema.carModels).values(modelsData).onConflictDoNothing();

        // 6. Colors
        console.log("🎨 Seeding colors...");
        const colorsData = [
            { name: "Black", hexCode: "#000000" },
            { name: "White", hexCode: "#FFFFFF" },
            { name: "Red", hexCode: "#FF0000" },
            { name: "Blue", hexCode: "#0000FF" },
            { name: "Silver", hexCode: "#C0C0C0" },
        ];
        await db.insert(schema.colors).values(colorsData).onConflictDoNothing();

        // 7. Users
        console.log("👥 Seeding users...");
        const usersData = [
            {
                id: "admin-001",
                email: "admin@phuketride.com",
                role: "admin",
                name: "Admin",
                surname: "User",
                phone: "+66812345678",
                isFirstLogin: false,
            },
            {
                id: "partner-001",
                email: "partner@example.com",
                role: "partner",
                name: "Tim",
                surname: "Logush",
                phone: "+66823456789",
                telegram: "@timlogush",
                isFirstLogin: false,
            },
            {
                id: "manager-001",
                email: "manager@example.com",
                role: "manager",
                name: "John",
                surname: "Manager",
                phone: "+66834567890",
                isFirstLogin: false,
            },
            {
                id: "user-001",
                email: "client@example.com",
                role: "user",
                name: "Anna",
                surname: "Client",
                phone: "+66845678901",
                passportNumber: "AB1234567",
                citizenship: "Russia",
                dateOfBirth: new Date("1990-05-15"),
                gender: "female",
                isFirstLogin: false,
            },
        ];
        await db.insert(schema.users).values(usersData).onConflictDoNothing();

        // 8. Companies
        console.log("🏢 Seeding companies...");
        const companiesData = [
            {
                name: "Tim Logush Rental",
                ownerId: "partner-001",
                email: "info@timlogush.com",
                phone: "+66823456789",
                telegram: "@timlogush",
                locationId: 1,
                districtId: 1,
                street: "Beach Road",
                houseNumber: "123",
                address: "123 Beach Road, Patong, Phuket",
                islandTripPrice: 1500,
                krabiTripPrice: 2000,
                babySeatPricePerDay: 200,
            },
        ];
        await db.insert(schema.companies).values(companiesData).onConflictDoNothing();

        // 9. Managers
        console.log("👔 Seeding managers...");
        const managersData = [
            {
                userId: "manager-001",
                companyId: 1,
                isActive: true,
            },
        ];
        await db.insert(schema.managers).values(managersData).onConflictDoNothing();

        // 10. Car Templates
        console.log("📋 Seeding car templates...");
        const templatesData = [
            {
                brandId: 1,
                modelId: 1,
                productionYear: 2023,
                transmission: "automatic",
                engineVolume: 0.16,
                bodyType: "scooter",
                seats: 2,
                doors: 0,
                fuelType: "petrol",
                description: "Popular scooter for city rides",
                photos: JSON.stringify([]),
            },
            {
                brandId: 2,
                modelId: 3,
                productionYear: 2022,
                transmission: "automatic",
                engineVolume: 2.7,
                bodyType: "suv",
                seats: 7,
                doors: 4,
                fuelType: "diesel",
                description: "Spacious SUV for family trips",
                photos: JSON.stringify([]),
            },
        ];
        await db.insert(schema.carTemplates).values(templatesData).onConflictDoNothing();

        // 11. Company Cars
        console.log("🚙 Seeding company cars...");
        const carsData = [
            {
                companyId: 1,
                templateId: 1,
                colorId: 1,
                licensePlate: "กข-1234",
                vin: "JH2PC40001M000001",
                year: 2023,
                transmission: "automatic",
                engineVolume: 0.16,
                fuelType: "petrol",
                pricePerDay: 300,
                deposit: 3000,
                minInsurancePrice: 100,
                maxInsurancePrice: 200,
                fullInsuranceMinPrice: 150,
                fullInsuranceMaxPrice: 300,
                mileage: 5000,
                nextOilChangeMileage: 15000,
                oilChangeInterval: 10000,
                status: "available",
                photos: JSON.stringify([]),
                description: "Well-maintained Honda PCX 160",
                marketingHeadline: "Perfect for city exploration",
            },
            {
                companyId: 1,
                templateId: 1,
                colorId: 2,
                licensePlate: "กข-5678",
                vin: "JH2PC40001M000002",
                year: 2023,
                transmission: "automatic",
                engineVolume: 0.16,
                fuelType: "petrol",
                pricePerDay: 300,
                deposit: 3000,
                status: "rented",
                photos: JSON.stringify([]),
            },
            {
                companyId: 1,
                templateId: 2,
                colorId: 1,
                licensePlate: "1กข-9999",
                vin: "MHFXW3820GK000001",
                year: 2022,
                transmission: "automatic",
                engineVolume: 2.7,
                fuelType: "diesel",
                pricePerDay: 2500,
                deposit: 20000,
                status: "available",
                photos: JSON.stringify([]),
            },
        ];
        await db.insert(schema.companyCars).values(carsData).onConflictDoNothing();

        // 12. Contracts
        console.log("📄 Seeding contracts...");
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(now.getDate() - 2);
        const endDate = new Date(now);
        endDate.setDate(now.getDate() + 5);

        const contractsData = [
            {
                companyCarId: 2,
                clientId: "user-001",
                managerId: "manager-001",
                startDate,
                endDate,
                totalAmount: 2100,
                totalCurrency: "THB",
                depositAmount: 3000,
                depositCurrency: "THB",
                depositPaymentMethod: "cash",
                fullInsuranceEnabled: true,
                fullInsurancePrice: 150,
                pickupDistrictId: 1,
                pickupHotel: "Patong Beach Hotel",
                pickupRoom: "301",
                deliveryCost: 300,
                returnDistrictId: 1,
                returnHotel: "Patong Beach Hotel",
                returnRoom: "301",
                returnCost: 300,
                startMileage: 5000,
                fuelLevel: "full",
                cleanliness: "clean",
                status: "active",
                notes: "Client prefers morning delivery",
            },
        ];
        await db.insert(schema.contracts).values(contractsData).onConflictDoNothing();

        // 13. Payment Types
        console.log("💳 Seeding payment types...");
        const paymentTypesData = [
            { name: "Rental Payment", sign: "+", description: "Payment for car rental", isSystem: true },
            { name: "Deposit", sign: "+", description: "Security deposit", isSystem: true },
            { name: "Deposit Return", sign: "-", description: "Return of security deposit", isSystem: true },
            { name: "Insurance", sign: "+", description: "Insurance payment", isSystem: true },
            { name: "Damage Fee", sign: "+", description: "Fee for vehicle damage", companyId: 1, isSystem: false },
        ];
        await db.insert(schema.paymentTypes).values(paymentTypesData).onConflictDoNothing();

        // 14. Payments
        console.log("💰 Seeding payments...");
        const paymentsData = [
            {
                contractId: 1,
                paymentTypeId: 1,
                amount: 2100,
                currency: "THB",
                paymentMethod: "cash",
                status: "completed",
                notes: "Full rental payment",
                createdBy: "manager-001",
            },
            {
                contractId: 1,
                paymentTypeId: 2,
                amount: 3000,
                currency: "THB",
                paymentMethod: "cash",
                status: "completed",
                notes: "Security deposit",
                createdBy: "manager-001",
            },
        ];
        await db.insert(schema.payments).values(paymentsData).onConflictDoNothing();

        // 15. Maintenance History
        console.log("🔧 Seeding maintenance history...");
        const maintenanceData = [
            {
                companyCarId: 1,
                maintenanceType: "oil_change",
                mileage: 5000,
                cost: 500,
                notes: "Regular oil change",
                performedAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
                performedBy: "manager-001",
            },
        ];
        await db.insert(schema.maintenanceHistory).values(maintenanceData).onConflictDoNothing();

        // 16. Calendar Events
        console.log("📅 Seeding calendar events...");
        const futureDate = new Date(now);
        futureDate.setDate(now.getDate() + 7);

        const eventsData = [
            {
                companyId: 1,
                eventType: "contract",
                title: "Contract End: Anna Client",
                description: "Contract ending for Honda PCX",
                startDate: endDate,
                relatedId: 1,
                color: "#3B82F6",
                status: "pending",
                createdBy: "manager-001",
            },
            {
                companyId: 1,
                eventType: "maintenance",
                title: "Oil Change Due",
                description: "Oil change needed for กข-1234",
                startDate: futureDate,
                relatedId: 1,
                color: "#F59E0B",
                status: "pending",
                createdBy: "manager-001",
            },
        ];
        await db.insert(schema.calendarEvents).values(eventsData).onConflictDoNothing();

        // 17. Audit Logs
        console.log("📝 Seeding audit logs...");
        const auditData = [
            {
                userId: "manager-001",
                role: "manager",
                companyId: 1,
                entityType: "contract",
                entityId: 1,
                action: "create",
                afterState: JSON.stringify({ status: "active" }),
                ipAddress: "127.0.0.1",
                userAgent: "Mozilla/5.0",
            },
        ];
        await db.insert(schema.auditLogs).values(auditData).onConflictDoNothing();

        console.log("✅ Seed completed successfully!");
    } catch (error) {
        console.error("❌ Seed failed:", error);
        throw error;
    }
}
