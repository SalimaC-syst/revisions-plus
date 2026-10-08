"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminTabs({ base, tabs }: { base: string; tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="tabs" aria-label="Sections de l'évaluation">
      {tabs.map((t) => {
        const href = base + t.href;
        return <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{t.label}</Link>;
      })}
    </nav>
  );
}
