"use client";
// Sub-navigation for the Social section

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/social", label: "Command Center" },
  { href: "/social/inbox", label: "Inbox" },
  { href: "/social/posts", label: "Posts" },
  { href: "/social/insights", label: "Insights & Playbook" },
  { href: "/social/settings", label: "Connect & Import" },
];

export default function SocialNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 border-b border-gray-200 mb-6">
      {TABS.map((t) => {
        const active = t.href === "/social" ? path === "/social" : path.startsWith(t.href);
        return (
          <Link key={t.href} href={t.href}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              active ? "border-blue-700 text-blue-700" : "border-transparent text-gray-600 hover:text-gray-900"
            }`}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
