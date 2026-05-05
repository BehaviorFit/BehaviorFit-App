import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export const metadata: Metadata = {
  title: "BehaviorFit",
  description: "ABA-based fitness tracking for behavior analysts",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {/* Top navigation bar */}
        <nav className="bg-blue-700 text-white px-6 py-4 flex items-center gap-6 shadow">
          <Link href="/" className="font-bold text-xl tracking-tight">
            BehaviorFit
          </Link>
          <Link href="/clients" className="hover:underline">
            Clients
          </Link>
          <Link href="/health" className="hover:underline">
            Health
          </Link>
          <LogoutButton />
        </nav>
        <main className="max-w-4xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
