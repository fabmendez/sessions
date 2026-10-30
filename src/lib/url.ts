import "server-only";
import { headers } from "next/headers";

/** The app's public address: APP_URL if set, otherwise worked out from the request (works behind Traefik). */
export async function baseUrl() {
  const fixed = process.env.APP_URL?.trim();
  if (fixed) return fixed.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim() ?? "http";
  return `${proto}://${host}`;
}
