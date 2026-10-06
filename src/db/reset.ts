import "./env";
import { connect } from "./connect";
const c = await connect({ max: 1 });
await c.run("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
await c.close();
console.log("Database reset");
