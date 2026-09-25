import type { JourJournal } from "./jour";
import { SEGMENT_CADRE, segmentClasse } from "@/lib/segmented";

// Cadre et onglets de la bascule Repos / Entraînement, partagés par le
// fallback serveur (JournalNavigationJour) et la bascule cliente.
export const ONGLETS: { value: JourJournal["jourType"]; label: string }[] = [
  { value: "repos", label: "Repos" },
  { value: "entrainement", label: "Entraînement" },
];

export const ONGLETS_CADRE = SEGMENT_CADRE;

export function ongletClasse(actif: boolean) {
  return segmentClasse(actif);
}
