"use client";

import { useState, useTransition } from "react";
import { deleteDocument } from "@/app/actions/documents";
import { DocumentForm } from "./DocumentForm";
import { formatEcheance, niveauAlerte } from "./echeance";
import type { Tables } from "@/lib/supabase/types";
import { TransitionLink } from "@/components/TransitionLink";
import { card, dangerButton, ghostButton, listCard, metaText, nameText, pillTag } from "@/lib/ui";

export function DocumentCard({ document }: { document: Tables<"documents"> }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className={card}>
        <DocumentForm document={document} onDone={() => setEditing(false)} />
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

  const alerte = niveauAlerte(document.date_echeance);

  return (
    <li className={listCard}>
      <TransitionLink href={`/documents/${document.id}`} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className={nameText}>{document.nom}</p>
          {document.categorie && <span className={pillTag}>{document.categorie}</span>}
        </div>
        {document.date_echeance && (
          <span
            className={
              alerte === "aucun"
                ? metaText
                : "w-fit rounded-full bg-alert/10 px-2 py-0.5 text-xs font-semibold text-alert"
            }
          >
            Échéance : {formatEcheance(document.date_echeance)}
          </span>
        )}
      </TransitionLink>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
          Modifier
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteDocument(document.id))}
          className={dangerButton}
        >
          Suppr.
        </button>
      </div>
    </li>
  );
}
