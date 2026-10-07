// Production entrypoint step: apply migrations, then add the demo data if the database is empty
// (and SEED_DEMO isn't "false"). Safe to run on every container start.
import "./env";
import { sql } from "drizzle-orm";
import { connect } from "./connect";

const c = await connect({ max: 1 });
await c.migrate("./drizzle");
console.log("Migrations applied");
const [{ n }] = await c.exec<{ n: number }>(sql`select count(*)::int as n from users`);
await c.close();
if (n === 0 && process.env.SEED_DEMO !== "false") {
  console.log("Empty database — adding demo data…");
  await import("./seed/index");
} else {
  console.log(n ? `Database has ${n} users — leaving data as is.` : "Empty database — SEED_DEMO=false, skipping demo data.");
}
