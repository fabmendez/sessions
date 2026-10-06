import "./env";
import { connect } from "./connect";
const c = await connect({ max: 1 });
await c.migrate("./drizzle");
await c.close();
console.log("Migrations applied");
