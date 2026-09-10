import type { TypeChampsEtiquette } from "@/app/actions/documents";

export const TYPE_CHAMPS_LABELS: Record<TypeChampsEtiquette, string> = {
  standard: "Standard (aucun champ en plus)",
  recto_verso: "Recto / Verso (deux fichiers dédiés)",
  periode_mensuelle: "Période mensuelle (+ champ \"mois concerné\")",
};

// documents.periode_mois est stocké comme le 1er jour du mois
// (ex. "2026-09-01") : affiché en "septembre 2026".
export function formatMois(periodeMoisIso: string): string {
  return new Date(`${periodeMoisIso}T00:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });
}
