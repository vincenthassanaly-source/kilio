"use client";

import { useState, useTransition } from "react";
import { changerStatutObjectif, supprimerObjectif } from "@/app/actions/objectifs";
import { ObjectifForm } from "../ObjectifForm";
import { TransitionLink } from "@/components/TransitionLink";
import type { Enums, Tables } from "@/lib/supabase/types";
import { card, dangerButton, errorText, ghostButton, input, linkButton } from "@/lib/ui";

const STATUT_LABELS: Record<Enums<"statut_objectif">, string> = {
  en_cours: "En cours",
  atteint: "Atteint",
  abandonne: "Abandonné",
};

const CATEGORIE_LABELS: Record<Enums<"categorie_objectif">, string> = {
  perso: "Personnel",
  pro: "Professionnel",
};

function formatEcheance(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ObjectifHeader({ objectif }: { objectif: Tables<"objectifs"> }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <div className={card}>
        <ObjectifForm objectif={objectif} onDone={() => setEditing(false)} />
        <button type="button" onClick={() => setEditing(false)} className="mt-2 text-sm text-ink-2 underline">
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <TransitionLink href="/objectifs" className={linkButton}>
        ‹ Objectifs
      </TransitionLink>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mt-1 truncate font-display text-[22px] font-semibold text-ink">
            {objectif.titre}
          </h1>
          <p className="text-[13px] text-ink-2">
            {CATEGORIE_LABELS[objectif.categorie]}
            {objectif.date_echeance ? ` · Échéance : ${formatEcheance(objectif.date_echeance)}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
            Éditer
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                try {
                  await supprimerObjectif(objectif.id);
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Erreur inconnue.");
                }
              });
            }}
            className={dangerButton}
          >
            Suppr.
          </button>
        </div>
      </div>

      {objectif.description && <p className="text-sm text-ink">{objectif.description}</p>}

      <select
        value={objectif.statut}
        disabled={isPending}
        onChange={(e) =>
          startTransition(() =>
            changerStatutObjectif(objectif.id, e.target.value as Enums<"statut_objectif">)
          )
        }
        className={`${input} w-fit`}
      >
        {(Object.keys(STATUT_LABELS) as Enums<"statut_objectif">[]).map((key) => (
          <option key={key} value={key}>
            {STATUT_LABELS[key]}
          </option>
        ))}
      </select>

      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
