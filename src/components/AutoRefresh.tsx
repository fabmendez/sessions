"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Lightweight polling for the MVP; swap for SSE/websockets later. */
export function AutoRefresh({ ms = 8000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    return () => clearInterval(t);
  }, [router, ms]);
  return null;
}
