import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PlayerProvider } from "@/components/Player";

export const metadata: Metadata = {
  title: { default: "Session — find your next collaborator", template: "%s · Session" },
  description: "A network for music creators to find collaborators, form projects and build credits.",
};
export const viewport: Viewport = { themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#17121c" }, { color: "#f3f0f5" }] };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className="min-h-dvh">
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
