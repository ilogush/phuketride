const fs = require('fs');

const path = 'app/lib/db-factory.server.ts';
let content = fs.readFileSync(path, 'utf8');

// Add missing imports
const missingImports = `import * as seasonsActions from "./seasons-actions.server";
import * as durationsActions from "./durations-actions.server";
import * as settingsActions from "./settings-actions.server";
import * as locationsActions from "./locations-actions.server";
import * as contractsNewAction from "./contracts-new-action.server";
import * as contractsEditAction from "./contracts-edit-action.server";
import * as carsCreateAction from "./cars-create-action.server";
import * as carsEditAction from "./cars-edit-action.server";
import * as bookingsCreateAction from "./bookings-create.server";
import type { AppLoadContext } from "~/types/context";
`;
content = content.replace('import type { AppLoadContext } from "~/types/context";', missingImports);

// Add missing object members using regex replace
content = content.replace(/durations:\s*\{\s*list:[^}]+\}/, `durations: {
            list: () => dictRepo.loadAdminDurations(db as any),
            handleAction: (args: Omit<Parameters<typeof durationsActions.handleDurationsAction>[0], "db">) =>
                durationsActions.handleDurationsAction({ ...args, db: db as any }),
        }`);

content = content.replace(/seasons:\s*\{\s*list:[^}]+\}/, `seasons: {
            list: () => dictRepo.loadAdminSeasons(db as any),
            handleAction: (args: Omit<Parameters<typeof seasonsActions.handleSeasonsAction>[0], "db">) =>
                seasonsActions.handleSeasonsAction({ ...args, db: db as any }),
        }`);

content = content.replace(/locations:\s*\{\s*\n\s*list:[^\n]+/, `locations: {
            list: (limit?: number) => cache.getCachedLocations(db as any),
            getPageData: (params: Omit<Parameters<typeof locationsPageRepo.loadLocationsPageData>[0], "db">) =>
                locationsPageRepo.loadLocationsPageData({ ...params, db: db as any }),
            handleAction: (args: Omit<Parameters<typeof locationsActions.handleLocationsAction>[0], "db">) =>
                locationsActions.handleLocationsAction({ ...args, db: db as any }),`);

content = content.replace(/companies:\s*\{[\s\S]*?getCreateData:[^\n]+\n\s*}/, match => {
    return match.replace('}', `    handleSettingsAction: (args: Omit<Parameters<typeof settingsActions.handleSettingsAction>[0], "db">) =>
                settingsActions.handleSettingsAction({ ...args, db: db as any }),
        }`);
});

content = content.replace(/cars:\s*\{[\s\S]*?getCreateData:[^\n]+\n\s*}/, match => {
    return match.replace('}', `    createAction: (args: Omit<Parameters<typeof carsCreateAction.handleCreateCarAction>[0], "db">) =>
                carsCreateAction.handleCreateCarAction({ ...args, db: db as any }),
            editAction: (args: Omit<Parameters<typeof carsEditAction.handleEditCarAction>[0], "db">) =>
                carsEditAction.handleEditCarAction({ ...args, db: db as any }),
        }`);
});

content = content.replace(/contracts:\s*\{[\s\S]*?getClosable:[^\n]+\n\s*}/, match => {
    return match.replace('}', `    newAction: (args: Omit<Parameters<typeof contractsNewAction.handleCreateContractAction>[0], "db" | "companyId">) =>
                contractsNewAction.handleCreateContractAction({ ...args, db: db as any, companyId: companyId! }),
            editAction: (args: Omit<Parameters<typeof contractsEditAction.handleEditContractAction>[0], "db" | "companyId">) =>
                contractsEditAction.handleEditContractAction({ ...args, db: db as any, companyId: companyId! }),
        }`);
});

content = content.replace(/bookings:\s*\{[\s\S]*?getById:[^\n]+\n\s*}/, match => {
    return match.replace('}', `    createAction: (args: Omit<Parameters<typeof bookingsCreateAction.createBookingAction>[0], "db" | "companyId">) =>
                bookingsCreateAction.createBookingAction({ ...args, db: db as any, companyId: companyId! }),
        }`);
});

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed db-factory.server.ts');
