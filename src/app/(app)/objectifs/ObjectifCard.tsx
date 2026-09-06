"use client";

import { useState, useTransition } from "react";
import { supprimerObjectif } from "@/app/actions/objectifs";
import { ObjectifForm } from "./ObjectifForm";
import type { Enums, Tables } from "@/lib/supabase/types";
import { TransitionLink } from "@/components/TransitionLink";
import { card, dangerButton, ghostButton, listCard, metaText, nameText, pillTag } from "@/lib/ui";

const TYPE_SUIVI_LABELS: Record<Enums<"type_suivi_objectif">, string> = {
  valeur: "Valeur",
  etapes: "Étapes",
  binaire: "Fait / pas fait",
};

function formatEcheance(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ObjectifCard({ objectif }: { objectif: Tables<"objectifs"> }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className={card}>
        <ObjectifForm objectif={objectif} onDone={() => setEditing(false)} />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="mt-2 text-sm text-ink-2 underline"
        >
          Annuler
        </button>
      </li>
    );
  }

  return (
    <li className={listCard}>
      <TransitionLink href={`/objectifs/${objectif.id}`} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className={nameText}>{objectif.titre}</p>
          <span className={pillTag}>{TYPE_SUIVI_LABELS[objectif.type_suivi]}</span>
        </div>
        {objectif.description && (
          <p className="line-clamp-2 text-[13px] text-ink-2">{objectif.description}</p>
        )}
        {objectif.date_echeance && (
          <span className={metaText}>Échéance : {formatEcheance(objectif.date_echeance)}</span>
        )}
      </TransitionLink>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
          Modifier
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => supprimerObjectif(objectif.id))}
          className={dangerButton}
        >
          Suppr.
        </button>
      </div>
    </li>
  );
}
