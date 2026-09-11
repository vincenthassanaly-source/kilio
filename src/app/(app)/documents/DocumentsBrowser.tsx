"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DocumentAvecFichiers } from "@/app/actions/documents";
import type { Tables } from "@/lib/supabase/types";
import { AddDocumentToggle } from "./AddDocumentToggle";
import { DocumentsList } from "./DocumentsList";
import { input, kcalPillTag, pillTag } from "@/lib/ui";

type TriCle = "echeance" | "nom" | "recent" | "etiquette";

const TRI_LABELS: Record<TriCle, string> = {
  echeance: "Échéance ↑",
  nom: "Nom A→Z",
  recent: "Récent",
  etiquette: "Étiquette A→Z",
};

function EtiquetteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11.5 3.5h6a2 2 0 0 1 2 2v6a2 2 0 0 1-.6 1.4l-8 8a2 2 0 0 1-2.8 0l-6-6a2 2 0 0 1 0-2.8l8-8a2 2 0 0 1 1.4-.6z" />
      <circle cx="15.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function DocumentsBrowser({
  documents,
  etiquettes,
}: {
  documents: DocumentAvecFichiers[];
  etiquettes: Tables<"etiquettes">[];
}) {
  const [search, setSearch] = useState("");
  const [etiquetteFilter, setEtiquetteFilter] = useState<string[]>([]);
  const [tri, setTri] = useState<TriCle>("echeance");

  function toggleEtiquetteFilter(id: string) {
    setEtiquetteFilter((ids) => (ids.includes(id) ? ids.filter((e) => e !== id) : [...ids, id]));
  }

  // Recherche client-side (nom, notes, catégorie, étiquette) : même approche
  // que NotesGrid, le volume mono-utilisateur ne justifie pas une recherche
  // full-text Postgres.
  const filtres = useMemo(() => {
    const term = search.toLowerCase().trim();
    return documents.filter((document) => {
      const matchesSearch =
        term === "" ||
        document.nom.toLowerCase().includes(term) ||
        (document.notes ?? "").toLowerCase().includes(term) ||
        (document.categorie ?? "").toLowerCase().includes(term) ||
        (document.etiquette?.nom.toLowerCase().includes(term) ?? false);
      const matchesEtiquette =
        etiquetteFilter.length === 0 ||
        (document.etiquette !== null && etiquetteFilter.includes(document.etiquette.id));
      return matchesSearch && matchesEtiquette;
    });
  }, [documents, search, etiquetteFilter]);

  const tries = useMemo(() => {
    const copie = [...filtres];
    switch (tri) {
      case "nom":
        return copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      case "recent":
        return copie.sort((a, b) => b.created_at.localeCompare(a.created_at));
      case "etiquette":
        return copie.sort((a, b) =>
          (a.etiquette?.nom ?? "").localeCompare(b.etiquette?.nom ?? "", "fr")
        );
      case "echeance":
      default:
        // L'ordre déjà renvoyé par getDocuments() (échéance croissante,
        // nulls en dernier) est préservé par ce tri stable.
        return copie.sort((a, b) => {
          if (a.date_echeance === b.date_echeance) return 0;
          if (a.date_echeance === null) return 1;
          if (b.date_echeance === null) return -1;
          return a.date_echeance.localeCompare(b.date_echeance);
        });
    }
  }, [filtres, tri]);

  return (
    <div className="flex flex-col gap-4">
      <AddDocumentToggle etiquettes={etiquettes} />

      {documents.length > 0 && (
        <>
          {etiquettes.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1" data-swipe-ignore>
              <Link
                href="/documents/etiquettes"
                aria-label="Gérer les étiquettes"
                title="Gérer les étiquettes"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-alt"
              >
                <EtiquetteIcon />
              </Link>
              {etiquettes.map((etiquette) => (
                <button
                  key={etiquette.id}
                  type="button"
                  onClick={() => toggleEtiquetteFilter(etiquette.id)}
                  className={
                    etiquetteFilter.includes(etiquette.id) ? `${kcalPillTag} shrink-0` : `${pillTag} shrink-0`
                  }
                >
                  {etiquette.nom}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Rechercher un document…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${input} min-w-0 flex-1`}
            />
            <select
              value={tri}
              onChange={(e) => setTri(e.target.value as TriCle)}
              aria-label="Trier les documents"
              className={`${input} max-w-[152px] shrink-0 truncate`}
            >
              {(Object.keys(TRI_LABELS) as TriCle[]).map((key) => (
                <option key={key} value={key}>
                  {TRI_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          {filtres.length === 0 ? (
            <p className="py-5 text-center text-sm text-ink-3">Aucun document ne correspond à ta recherche.</p>
          ) : (
            <DocumentsList documents={tries} etiquettes={etiquettes} />
          )}
        </>
      )}

      {documents.length === 0 && <DocumentsList documents={documents} etiquettes={etiquettes} />}
    </div>
  );
}
