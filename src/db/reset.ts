import "./env";
import postgres from "postgres";
const client = postgres(process.env.DATABASE_URL!, { max: 1, onnotice: () => {} });
await client.unsafe("drop schema if exists public cascade; drop schema if exists drizzle cascade; create schema public;");
await client.end();
console.log("Database reset");
