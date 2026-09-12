"use client";

import { useRef, useState, useTransition } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { enregistrerEntreeObjectif } from "@/app/actions/objectifs";
import { queryKeys } from "@/lib/query/keys";
import { showToast } from "@/components/toast/toast-store";
import type { Tables } from "@/lib/supabase/types";
import { card, ghostButton, input, label as labelClass, metaText, sectionTitle } from "@/lib/ui";
import { toISODate } from "../date-utils";

function EvolutionChart({
  entries,
  cible,
}: {
  entries: Tables<"objectif_entries">[];
  cible: number | null;
}) {
  if (entries.length < 2) return null;

  const width = 320;
  const height = 100;
  const padding = 8;

  const valeurs = entries.map((e) => e.valeur);
  const min = Math.min(...valeurs, cible ?? Infinity);
  const max = Math.max(...valeurs, cible ?? -Infinity);
  const range = max - min || 1;

  const points = entries.map((e, i) => {
    const x = padding + (i / (entries.length - 1)) * (width - padding * 2);
    const y = height - padding - ((e.valeur - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const cibleY =
    cible != null ? height - padding - ((cible - min) / range) * (height - padding * 2) : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="Évolution de la valeur dans le temps"
    >
      {cibleY != null && (
        <line
          x1={padding}
          y1={cibleY}
          x2={width - padding}
          y2={cibleY}
          stroke="var(--line)"
          strokeDasharray="4 3"
          strokeWidth={1}
        />
      )}
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="var(--accent-kcal)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Saisie ponctuelle (au plus une fois par jour), pas une bascule répétée :
// reste en Server Action + useTransition, sans rendu optimiste local (même
// patron que SousTachesList dans taches/TasksList.tsx). `invalidateQueries`
// remplace la reconciliation par prop qu'assurait `revalidatePath` avant le
// passage de la page détail en lecture côté client (TanStack Query) :
// cette Server Action continue d'appeler `revalidatePath`, mais ce
// mécanisme n'a plus d'effet sur le cache TanStack de cette page.
export function ObjectifSuiviValeur({
  objectifId,
  objectif,
  entries,
}: {
  objectifId: string;
  objectif: Tables<"objectifs">;
  entries: Tables<"objectif_entries">[];
}) {
  const [isPending, startTransition] = useTransition();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(() => toISODate(new Date()));
  const valeurInputRef = useRef<HTMLInputElement>(null);

  const valeurExistante = entries.find((e) => e.date === date)?.valeur;

  const derniere = entries[entries.length - 1] ?? null;
  const ratio =
    objectif.valeur_cible != null
      ? Math.min(1, Math.max(0, (derniere?.valeur ?? 0) / objectif.valeur_cible))
      : null;

  function enregistrer() {
    const nombre = Number(valeurInputRef.current?.value ?? "");
    if (!Number.isFinite(nombre)) return;
    startTransition(async () => {
      try {
        await enregistrerEntreeObjectif(objectifId, date, nombre);
        queryClient.invalidateQueries({ queryKey: queryKeys.objectif(objectifId) });
      } catch {
        showToast("Impossible d'enregistrer cette valeur.");
      }
    });
  }

  return (
    <div className={`${card} flex flex-col gap-4`}>
      <h2 className={sectionTitle}>Évolution</h2>

      {objectif.valeur_cible != null && (
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-alt">
            <div
              className="h-full rounded-full bg-kcal transition-all"
              style={{ width: `${(ratio ?? 0) * 100}%` }}
            />
          </div>
          <span className={metaText}>
            {derniere ? derniere.valeur : 0}
            {objectif.unite ? ` ${objectif.unite}` : ""} / {objectif.valeur_cible}
            {objectif.unite ? ` ${objectif.unite}` : ""}
          </span>
        </div>
      )}

      <EvolutionChart entries={entries} cible={objectif.valeur_cible} />

      <div className="flex items-end gap-2">
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="date-entree" className={labelClass}>
            Date
          </label>
          <input
            id="date-entree"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={input}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <label htmlFor="valeur-entree" className={labelClass}>
            Valeur{objectif.unite ? ` (${objectif.unite})` : ""}
          </label>
          <input
            key={date}
            id="valeur-entree"
            ref={valeurInputRef}
            type="number"
            step="any"
            defaultValue={valeurExistante ?? ""}
            className={input}
          />
        </div>
        <button type="button" disabled={isPending} onClick={enregistrer} className={ghostButton}>
          Enregistrer
        </button>
      </div>
    </div>
  );
}
