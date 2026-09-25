import type { JourJournal } from "./jour";

// Cadre et onglets de la bascule Repos / Entraînement, partagés par le
// fallback serveur (JournalNavigationJour) et la bascule cliente.
export const ONGLETS: { value: JourJournal["jourType"]; label: string }[] = [
  { value: "repos", label: "Repos" },
  { value: "entrainement", label: "Entraînement" },
];

export const ONGLETS_CADRE = "flex gap-1.5 rounded-2xl bg-surface-alt p-1";

export function ongletClasse(actif: boolean) {
  return `flex min-h-11 flex-1 items-center justify-center rounded-xl text-center text-[13.5px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kcal focus-visible:ring-offset-2 ${
    actif ? "bg-kcal text-on-kcal" : "text-ink-2"
  }`;
}
