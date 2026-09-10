"use client";

import { useState, useTransition } from "react";
import { deleteDossier, renameDossier } from "@/app/actions/documents";
import { aplatirDossiers, type DossierAvecProfondeur } from "../dossiers-tree";
import type { Tables } from "@/lib/supabase/types";
import { dangerButton, errorText, ghostButton, input, listCard, nameText } from "@/lib/ui";

function DossierRow({
  dossier,
  aUnSousDossier,
}: {
  dossier: DossierAvecProfondeur;
  aUnSousDossier: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(dossier.nom);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await renameDossier(dossier.id, trimmed);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  function handleDelete() {
    const avertissement = aUnSousDossier
      ? `Supprimer le dossier « ${dossier.nom} » supprimera aussi ses sous-dossiers. Les documents ne seront pas supprimés. Continuer ?`
      : `Supprimer le dossier « ${dossier.nom} » ? Les documents ne seront pas supprimés.`;
    if (!window.confirm(avertissement)) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteDossier(dossier.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  return (
    <li className={`${listCard} gap-2`} style={{ marginLeft: dossier.profondeur * 16 }}>
      {editing ? (
        <form onSubmit={handleRename} className="flex items-center gap-2">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
            className={`${input} flex-1 py-1.5`}
          />
          <button type="submit" disabled={isPending} className={ghostButton}>
            Enregistrer
          </button>
          <button
            type="button"
            onClick={() => {
              setNom(dossier.nom);
              setEditing(false);
            }}
            className="text-sm text-ink-2 underline"
          >
            Annuler
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className={nameText}>{dossier.nom}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
              Renommer
            </button>
            <button type="button" disabled={isPending} onClick={handleDelete} className={dangerButton}>
              Suppr.
            </button>
          </div>
        </div>
      )}
      {error && <p className={errorText}>{error}</p>}
    </li>
  );
}

export function DossiersManager({ dossiers }: { dossiers: Tables<"dossiers">[] }) {
  const dossiersAplatis = aplatirDossiers(dossiers);

  if (dossiersAplatis.length === 0) {
    return <p className="text-ink-2">Aucun dossier pour l&apos;instant.</p>;
  }

  const enfantsParParent = new Set(dossiers.filter((d) => d.parent_id).map((d) => d.parent_id));

  return (
    <ul className="flex flex-col gap-2">
      {dossiersAplatis.map((dossier) => (
        <DossierRow key={dossier.id} dossier={dossier} aUnSousDossier={enfantsParParent.has(dossier.id)} />
      ))}
    </ul>
  );
}
