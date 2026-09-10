"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DocumentAvecFichiers } from "@/app/actions/documents";
import { aplatirDossiers, libelleDossier } from "./dossiers-tree";
import type { Tables } from "@/lib/supabase/types";
import { AddDocumentToggle } from "./AddDocumentToggle";
import { DocumentsList } from "./DocumentsList";
import { input, kcalPillTag, pillTag } from "@/lib/ui";

type TriCle = "echeance" | "nom" | "recent" | "etiquette";

const TRI_LABELS: Record<TriCle, string> = {
  echeance: "Échéance la plus proche",
  nom: "Nom (A → Z)",
  recent: "Ajout le plus récent",
  etiquette: "Étiquette (A → Z)",
};

function DossierIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5a2 2 0 0 1 2-2h4.2l2 2.2h6.8a2 2 0 0 1 2 2v7.3a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z" />
    </svg>
  );
}

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
  dossiers,
  etiquettes,
}: {
  documents: DocumentAvecFichiers[];
  dossiers: Tables<"dossiers">[];
  etiquettes: Tables<"etiquettes">[];
}) {
  const [search, setSearch] = useState("");
  const [dossierFilter, setDossierFilter] = useState<string[]>([]);
  const [etiquetteFilter, setEtiquetteFilter] = useState<string[]>([]);
  const [tri, setTri] = useState<TriCle>("echeance");

  const dossiersAplatis = useMemo(() => aplatirDossiers(dossiers), [dossiers]);

  function toggleDossierFilter(id: string) {
    setDossierFilter((ids) => (ids.includes(id) ? ids.filter((d) => d !== id) : [...ids, id]));
  }

  function toggleEtiquetteFilter(id: string) {
    setEtiquetteFilter((ids) => (ids.includes(id) ? ids.filter((e) => e !== id) : [...ids, id]));
  }

  // Recherche client-side (nom, notes, catégorie, dossiers, étiquette) :
  // même approche que NotesGrid, le volume mono-utilisateur ne justifie pas
  // une recherche full-text Postgres.
  const filtres = useMemo(() => {
    const term = search.toLowerCase().trim();
    return documents.filter((document) => {
      const matchesSearch =
        term === "" ||
        document.nom.toLowerCase().includes(term) ||
        (document.notes ?? "").toLowerCase().includes(term) ||
        (document.categorie ?? "").toLowerCase().includes(term) ||
        (document.etiquette?.nom.toLowerCase().includes(term) ?? false) ||
        document.dossiers.some((d) => d.nom.toLowerCase().includes(term));
      // Dossiers : un document peut en avoir plusieurs, donc filtre en ET
      // (doit être dans chaque dossier sélectionné). Étiquette : un document
      // n'en a qu'une, donc filtre en OU (doit avoir l'une des étiquettes
      // sélectionnées) — un ET sur plusieurs étiquettes ne matcherait jamais.
      const matchesDossiers =
        dossierFilter.length === 0 ||
        dossierFilter.every((id) => document.dossiers.some((d) => d.id === id));
      const matchesEtiquette =
        etiquetteFilter.length === 0 ||
        (document.etiquette !== null && etiquetteFilter.includes(document.etiquette.id));
      return matchesSearch && matchesDossiers && matchesEtiquette;
    });
  }, [documents, search, dossierFilter, etiquetteFilter]);

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
      <AddDocumentToggle dossiers={dossiers} etiquettes={etiquettes} />

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
            <DocumentsList documents={tries} dossiers={dossiers} etiquettes={etiquettes} />
          )}
        </>
      )}

      {documents.length === 0 && (
        <DocumentsList documents={documents} dossiers={dossiers} etiquettes={etiquettes} />
      )}
    </div>
  );
}
