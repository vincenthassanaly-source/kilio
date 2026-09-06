"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { enregistrerEntreeObjectif } from "@/app/actions/objectifs";
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

// Nouvelle entrée affichée optimistiquement (barre de progression,
// historique/graphe) avant confirmation serveur — même pattern
// `useOptimistic` que JournalEntriesList, pas TanStack Query. L'upsert
// serveur (clé `objectif_id, date`) est reproduit ici en remplaçant toute
// entrée existante à la même date plutôt qu'en l'empilant, pour un rendu
// optimiste fidèle au comportement final ; réconcilié par la nouvelle prop
// `entries` une fois `enregistrerEntreeObjectif` (qui appelle
// revalidatePath) résolue, sans rollback manuel en cas d'échec.
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
  const [optimisticEntries, ajouterOptimiste] = useOptimistic(
    entries,
    (state, entree: Tables<"objectif_entries">) =>
      [...state.filter((e) => e.date !== entree.date), entree].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
  );
  const [date, setDate] = useState(() => toISODate(new Date()));
  const valeurInputRef = useRef<HTMLInputElement>(null);

  const valeurExistante = optimisticEntries.find((e) => e.date === date)?.valeur;

  const derniere = optimisticEntries[optimisticEntries.length - 1] ?? null;
  const ratio =
    objectif.valeur_cible != null
      ? Math.min(1, Math.max(0, (derniere?.valeur ?? 0) / objectif.valeur_cible))
      : null;

  function enregistrer() {
    const nombre = Number(valeurInputRef.current?.value ?? "");
    if (!Number.isFinite(nombre)) return;
    startTransition(async () => {
      ajouterOptimiste({
        id: `optimiste-${date}`,
        objectif_id: objectifId,
        date,
        valeur: nombre,
        created_at: new Date().toISOString(),
      });
      try {
        await enregistrerEntreeObjectif(objectifId, date, nombre);
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

      <EvolutionChart entries={optimisticEntries} cible={objectif.valeur_cible} />

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
