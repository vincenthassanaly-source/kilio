"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DocumentAvecFichiers } from "@/app/actions/documents";
import { aplatirDossiers, libelleDossier } from "./dossiers-tree";
import type { Tables } from "@/lib/supabase/types";
import { AddDocumentToggle } from "./AddDocumentToggle";
import { DocumentsList } from "./DocumentsList";
import { input, pillTag } from "@/lib/ui";

type TriCle = "echeance" | "nom" | "recent";

const TRI_LABELS: Record<TriCle, string> = {
  echeance: "Échéance la plus proche",
  nom: "Nom (A → Z)",
  recent: "Ajout le plus récent",
};

function DossierIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5a2 2 0 0 1 2-2h4.2l2 2.2h6.8a2 2 0 0 1 2 2v7.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function DocumentsBrowser({
  documents,
  dossiers,
}: {
  documents: DocumentAvecFichiers[];
  dossiers: Tables<"dossiers">[];
}) {
  const [search, setSearch] = useState("");
  const [dossierFilter, setDossierFilter] = useState<string[]>([]);
  const [tri, setTri] = useState<TriCle>("echeance");

  const dossiersAplatis = useMemo(() => aplatirDossiers(dossiers), [dossiers]);

  function toggleDossierFilter(id: string) {
    setDossierFilter((ids) => (ids.includes(id) ? ids.filter((d) => d !== id) : [...ids, id]));
  }

  // Recherche client-side (nom, notes, catégorie, dossiers) : même approche
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
        document.dossiers.some((d) => d.nom.toLowerCase().includes(term));
      const matchesDossiers =
        dossierFilter.length === 0 ||
        dossierFilter.every((id) => document.dossiers.some((d) => d.id === id));
      return matchesSearch && matchesDossiers;
    });
  }, [documents, search, dossierFilter]);

  const tries = useMemo(() => {
    const copie = [...filtres];
    switch (tri) {
      case "nom":
        return copie.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
      case "recent":
        return copie.sort((a, b) => b.created_at.localeCompare(a.created_at));
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
      <AddDocumentToggle dossiers={dossiers} />

      {documents.length > 0 && (
        <>
          <div className="flex items-center gap-2 overflow-x-auto pb-1" data-swipe-ignore>
            <Link
              href="/documents/dossiers"
              aria-label="Gérer les dossiers"
              title="Gérer les dossiers"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-colors hover:bg-surface-alt"
            >
              <DossierIcon />
            </Link>
            {dossiersAplatis.map((dossier) => (
              <button
                key={dossier.id}
                type="button"
                onClick={() => toggleDossierFilter(dossier.id)}
                className={
                  dossierFilter.includes(dossier.id)
                    ? `${pillTag} shrink-0 bg-kcal-soft font-bold text-kcal`
                    : `${pillTag} shrink-0`
                }
              >
                {libelleDossier(dossier)}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="search"
              placeholder="Rechercher un document…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${input} flex-1`}
            />
            <select
              value={tri}
              onChange={(e) => setTri(e.target.value as TriCle)}
              aria-label="Trier les documents"
              className={`${input} w-auto shrink-0`}
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
            <DocumentsList documents={tries} dossiers={dossiers} />
          )}
        </>
      )}

      {documents.length === 0 && (
        <DocumentsList documents={documents} dossiers={dossiers} />
      )}
    </div>
  );
}
