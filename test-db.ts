import { createScopedDb } from "./app/lib/db-factory.server";
console.log(typeof createScopedDb);
const db = createScopedDb({}, null);
console.log(db);
try {
  console.log(db.brands);
} catch (e) {
  console.error("Error accessing brands:", e);
}
