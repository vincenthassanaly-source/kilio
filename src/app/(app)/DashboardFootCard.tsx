import Link from "next/link";
import { card } from "@/lib/ui";
import { findNavItem } from "@/lib/navigation/registry";

const FOOT_ICON = findNavItem("/foot")!.icon;

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

// Carte purement statique (aucun Server Component async, aucun fetch) : le
// widget dashboard ne doit jamais déclencher d'appel API-Football, seule la
// page /foot le fait à l'ouverture — contrainte de quota (100 req/jour,
// plan gratuit) documentée dans reports/2026-09-06-module-foot.md.
export function DashboardFootCard() {
  return (
    <Link href="/foot" className={`${card} flex items-center gap-3.5`}>
      <div
        className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl"
        style={{ background: "color-mix(in oklch, var(--accent-foot) 12%, transparent)" }}
      >
        {FOOT_ICON("var(--accent-foot)")}
      </div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-3">Foot</span>
        <span className="text-[14px] font-semibold text-ink">Résultats du jour</span>
      </div>
      <ChevronIcon />
    </Link>
  );
}
