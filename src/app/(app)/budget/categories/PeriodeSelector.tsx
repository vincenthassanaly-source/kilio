"use client";

import { useRouter } from "next/navigation";
import type { Enums } from "@/lib/supabase/types";
import { formatPeriode, periodeAdjacente, periodeParDefaut } from "@/lib/budget/compute";
import { Skeleton } from "@/components/skeletons/Skeleton";
import { ghostButton } from "@/lib/ui";
import { SEGMENT_CADRE, segmentClasse } from "@/lib/segmented";

const ONGLETS: { value: Enums<"type_periode_budget">; label: string }[] = [
  { value: "hebdomadaire", label: "Semaine" },
  { value: "mensuel", label: "Mois" },
  { value: "annuel", label: "Année" },
];

type Selection = {
  typePeriode: Enums<"type_periode_budget">;
  periode: string;
  /** Paramètres d'URL courants, conservés d'une période à l'autre. */
  parametres: string;
};

/**
 * Sélecteur de période des Catégories. Sans `selection` (fallback de
 * `<Suspense>`, donc dans la coquille) : même cadre, boutons inactifs, le
 * temps que la période soit lue dans l'URL.
 */
export function PeriodeSelector({ selection }: { selection?: Selection }) {
  const router = useRouter();

  function naviguer(nouveauTypePeriode: Enums<"type_periode_budget">, nouvellePeriode: string) {
    const params = new URLSearchParams(selection?.parametres);
    params.set("type_periode", nouveauTypePeriode);
    params.set("periode", nouvellePeriode);
    router.push(`/budget/categories?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={SEGMENT_CADRE} role="group" aria-label="Type de période">
        {ONGLETS.map((onglet) => (
          <button
            key={onglet.value}
            type="button"
            disabled={!selection}
            onClick={() => naviguer(onglet.value, periodeParDefaut(onglet.value))}
            aria-pressed={selection?.typePeriode === onglet.value}
            className={`${segmentClasse(selection?.typePeriode === onglet.value, "sm")} disabled:opacity-60`}
          >
            {onglet.label}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={!selection}
          onClick={() =>
            selection && naviguer(selection.typePeriode, periodeAdjacente(selection.periode, selection.typePeriode, -1))
          }
          className={`${ghostButton} disabled:opacity-50`}
        >
          ← Précédent
        </button>
        {selection ? (
          <p className="text-[13px] font-semibold text-ink">{formatPeriode(selection.periode, selection.typePeriode)}</p>
        ) : (
          <Skeleton className="h-4 w-28" />
        )}
        <button
          type="button"
          disabled={!selection}
          onClick={() =>
            selection && naviguer(selection.typePeriode, periodeAdjacente(selection.periode, selection.typePeriode, 1))
          }
          className={`${ghostButton} disabled:opacity-50`}
        >
          Suivant →
        </button>
      </div>
    </div>
  );
}
