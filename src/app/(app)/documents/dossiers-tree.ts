import type { Tables } from "@/lib/supabase/types";

export type DossierAvecProfondeur = Tables<"dossiers"> & { profondeur: number };

// Aplatit l'arbre des dossiers en ordre topologique (un parent toujours
// avant ses enfants), avec la profondeur de chacun, pour l'afficher indenté
// dans une liste plate (sélecteurs, gestionnaire, filtres) sans que chaque
// appelant reconstruise l'arbre lui-même. Tri alphabétique au sein d'une
// même fratrie.
export function aplatirDossiers(dossiers: Tables<"dossiers">[]): DossierAvecProfondeur[] {
  const tries = [...dossiers].sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
  const enfantsDe = new Map<string | null, Tables<"dossiers">[]>();
  for (const dossier of tries) {
    const liste = enfantsDe.get(dossier.parent_id) ?? [];
    liste.push(dossier);
    enfantsDe.set(dossier.parent_id, liste);
  }

  const resultat: DossierAvecProfondeur[] = [];
  function visiter(parentId: string | null, profondeur: number) {
    for (const dossier of enfantsDe.get(parentId) ?? []) {
      resultat.push({ ...dossier, profondeur });
      visiter(dossier.id, profondeur + 1);
    }
  }
  visiter(null, 0);
  return resultat;
}

export function libelleDossier(dossier: DossierAvecProfondeur): string {
  return `${"—  ".repeat(dossier.profondeur)}${dossier.nom}`;
}
