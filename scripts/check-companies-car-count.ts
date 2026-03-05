import { execSync } from "node:child_process";

type QueryRow = {
    companyId: number;
    storedCarCount: number;
    actualCarCount: number;
};

type WranglerResponse = Array<{
    results?: QueryRow[];
}>;

const sql = [
    "SELECT c.id AS companyId,",
    "c.car_count AS storedCarCount,",
    "(SELECT COUNT(*) FROM company_cars cc WHERE cc.company_id = c.id) AS actualCarCount",
    "FROM companies c",
    "WHERE c.car_count != (SELECT COUNT(*) FROM company_cars cc WHERE cc.company_id = c.id)",
    "ORDER BY c.id ASC",
    "LIMIT 100;",
].join(" ");

function run(): void {
    const cmd = `npx wrangler d1 execute phuketride-bd --remote --command ${JSON.stringify(sql)}`;
    const raw = execSync(cmd, { encoding: "utf8" });
    const jsonStart = raw.indexOf("[");
    if (jsonStart === -1) {
        throw new Error("Failed to parse wrangler output");
    }

    const payload = JSON.parse(raw.slice(jsonStart)) as WranglerResponse;
    const rows = payload[0]?.results || [];

    if (rows.length === 0) {
        console.log("OK: companies.car_count is in sync with company_cars");
        return;
    }

    console.log(`Mismatch found: ${rows.length} companies (showing up to 100)`);
    for (const row of rows) {
        console.log(
            `companyId=${row.companyId} stored=${row.storedCarCount} actual=${row.actualCarCount}`,
        );
    }

    process.exitCode = 1;
}

run();
