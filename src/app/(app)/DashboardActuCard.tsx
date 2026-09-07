import { TransitionLink } from "@/components/TransitionLink";
import { findNavItem } from "@/lib/navigation/registry";
import { card } from "@/lib/ui";

// Carte statique, sans fetch : contrairement aux autres cartes du dashboard
// (Nutrition, Tâches, Habitudes), l'actu n'a pas de résumé "du jour" à
// précharger, juste un accès rapide vers /actualite. Même approche que
// l'ancien widget dashboard du module Foot (retiré depuis).
export function DashboardActuCard() {
  const item = findNavItem("/actualite")!;

  return (
    <TransitionLink href="/actualite" className={`${card} flex items-center gap-3`}>
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        style={{ background: `color-mix(in oklch, ${item.accentVar} 12%, transparent)` }}
      >
        {item.icon(item.accentVar)}
      </span>
      <span className="flex-1 font-display text-[15px] font-semibold text-ink">Actualité</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 6l6 6-6 6" />
      </svg>
    </TransitionLink>
  );
}
