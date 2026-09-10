"use client";

import { useState, useTransition } from "react";
import { deleteDocument } from "@/app/actions/documents";
import { DocumentForm } from "../DocumentForm";
import { formatEcheance, niveauAlerte } from "../echeance";
import { TransitionLink } from "@/components/TransitionLink";
import type { Tables } from "@/lib/supabase/types";
import { card, dangerButton, errorText, ghostButton, linkButton, pillTag } from "@/lib/ui";

export function DocumentDetail({ document }: { document: Tables<"documents"> }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <div className={card}>
        <DocumentForm document={document} onDone={() => setEditing(false)} />
        <button type="button" onClick={() => setEditing(false)} className="mt-2 text-sm text-ink-2 underline">
          Annuler
        </button>
      </div>
    );
  }

  const alerte = niveauAlerte(document.date_echeance);

  return (
    <div className="flex flex-col gap-4">
      <TransitionLink href="/documents" className={linkButton}>
        ‹ Documents
      </TransitionLink>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mt-1 truncate font-display text-[22px] font-semibold text-ink">{document.nom}</h1>
          {document.categorie && <span className={pillTag}>{document.categorie}</span>}
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
                  await deleteDocument(document.id);
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

      {document.date_echeance && (
        <span
          className={
            alerte === "aucun"
              ? "text-sm text-ink-2"
              : "w-fit rounded-full bg-alert/10 px-2.5 py-1 text-sm font-semibold text-alert"
          }
        >
          Échéance : {formatEcheance(document.date_echeance)}
        </span>
      )}

      {document.notes && <p className="whitespace-pre-wrap text-sm text-ink">{document.notes}</p>}

      <div className={card}>
        {document.fichier_type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL Supabase Storage externe, pas d'optimisation next/image requise pour un aperçu.
          <img
            src={document.fichier_url}
            alt={document.nom}
            className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain"
          />
        ) : (
          <a
            href={document.fichier_url}
            target="_blank"
            rel="noreferrer"
            className={linkButton}
          >
            Ouvrir le PDF ↗
          </a>
        )}
      </div>

      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
