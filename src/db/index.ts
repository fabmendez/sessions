import type { SQL } from "drizzle-orm";
import { connect, type Conn } from "./connect";
import * as schema from "./schema";

// One connection per server process (survives dev hot-reloads).
const g = globalThis as unknown as { __conn?: Promise<Conn> };
const conn = (g.__conn ??= connect());
const c = await conn;

export const db = c.db;
export const exec = <T,>(q: SQL) => c.exec<T>(q);
export { schema };
