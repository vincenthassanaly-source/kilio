"use client";

import { usePathname } from "next/navigation";
import { TransitionLink } from "@/components/TransitionLink";
import { SEGMENT_CADRE, segmentClasse } from "@/components/SegmentedControl";

const TABS = [
  { href: "/nutrition/journal", label: "Journal" },
  { href: "/nutrition/recettes", label: "Recettes" },
];

export function NutritionSubNav() {
  const pathname = usePathname();

  return (
    <nav className={SEGMENT_CADRE} aria-label="Nutrition">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <TransitionLink
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={segmentClasse(active)}
          >
            {tab.label}
          </TransitionLink>
        );
      })}
    </nav>
  );
}
