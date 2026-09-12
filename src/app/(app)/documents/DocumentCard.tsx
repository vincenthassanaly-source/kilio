"use client";

import { useState, useTransition } from "react";
import { deleteDocument, type DocumentAvecFichiers } from "@/app/actions/documents";
import { DocumentForm } from "./DocumentForm";
import { formatEcheance, niveauAlerte } from "./echeance";
import { formatMois } from "./champs";
import { ImageLightbox } from "@/components/ImageLightbox";
import { TransitionLink } from "@/components/TransitionLink";
import type { Tables } from "@/lib/supabase/types";
import { card, dangerButton, ghostButton, kcalPillTag, listCard, metaText, nameText, pillTag } from "@/lib/ui";

function PdfIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3.5h9l3 3V19a1.5 1.5 0 0 1-1.5 1.5h-10.5A1.5 1.5 0 0 1 4.5 19V5A1.5 1.5 0 0 1 6 3.5z" />
      <path d="M9 13h6M9 16.5h4" />
    </svg>
  );
}

export function DocumentCard({
  document,
  etiquettes,
}: {
  document: DocumentAvecFichiers;
  etiquettes: Tables<"etiquettes">[];
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  if (editing) {
    return (
      <li className={card}>
        <DocumentForm
          document={document}
          etiquettes={etiquettes}
          onDone={() => setEditing(false)}
        />
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
  const apercu = document.fichiers[0] ?? null;

  return (
    <li className={listCard}>
      <div className="flex items-center gap-3">
        {apercu && apercu.fichier_type === "image" ? (
          <button
            type="button"
            onClick={() => setLightboxSrc(apercu.url)}
            className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-line"
            aria-label="Agrandir l'aperçu"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public, pas d'un domaine unique configurable dans next/image */}
            <img
              src={apercu.url}
              alt=""
              style={{ viewTransitionName: `document-cover-${document.id}` }}
              className="h-full w-full object-cover"
            />
          </button>
        ) : apercu ? (
          <a
            href={apercu.url}
            target="_blank"
            rel="noreferrer"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-line bg-surface-alt text-ink-2"
            aria-label="Ouvrir le PDF"
          >
            <PdfIcon />
          </a>
        ) : null}

        <TransitionLink href={`/documents/${document.id}`} className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <p className={nameText} style={{ viewTransitionName: `document-title-${document.id}` }}>
              {document.nom}
            </p>
            <div className="flex shrink-0 gap-1.5">
              {document.etiquette && <span className={kcalPillTag}>{document.etiquette.nom}</span>}
              {document.categorie && <span className={pillTag}>{document.categorie}</span>}
            </div>
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
          {document.periode_mois && (
            <span className={metaText}>Période : {formatMois(document.periode_mois)}</span>
          )}
        </TransitionLink>
      </div>
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

      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </li>
  );
}
