"use client";

import { useState, useTransition } from "react";
import { supprimerCompte, type CompteAvecSolde } from "@/app/actions/comptes";
import { formatMontant } from "@/lib/budget/compute";
import { AddCompteForm } from "./AddCompteForm";
import { card, dangerButton, ghostButton, listCard, metaText, nameText, pillTag } from "@/lib/ui";
import { confirmDelete } from "@/lib/confirm";
import type { Enums } from "@/lib/supabase/types";

const TYPE_LABELS: Record<Enums<"type_compte">, string> = {
  courant: "Courant",
  epargne: "Épargne",
  autre: "Autre",
};

function CompteCard({ compte }: { compte: CompteAvecSolde }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className={card}>
        <AddCompteForm compte={compte} onDone={() => setEditing(false)} />
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

  const negatif = compte.solde < 0;

  return (
    <li className={listCard}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <p className={nameText}>{compte.nom}</p>
          <span className={pillTag}>{TYPE_LABELS[compte.type]}</span>
        </div>
        <p className={`font-display text-lg font-semibold ${negatif ? "text-alert" : "text-ink"}`}>
          {formatMontant(compte.solde)}
        </p>
      </div>
      <span className={metaText}>Solde initial : {formatMontant(compte.solde_initial)}</span>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
          Modifier
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (!confirmDelete(`Supprimer le compte « ${compte.nom} » ?`)) return;
            startTransition(() => supprimerCompte(compte.id));
          }}
          className={dangerButton}
        >
          Suppr.
        </button>
      </div>
    </li>
  );
}

export function ComptesList({ comptes }: { comptes: CompteAvecSolde[] }) {
  if (comptes.length === 0) {
    return <p className="text-ink-2">Aucun compte pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {comptes.map((compte) => (
        <CompteCard key={compte.id} compte={compte} />
      ))}
    </ul>
  );
}
