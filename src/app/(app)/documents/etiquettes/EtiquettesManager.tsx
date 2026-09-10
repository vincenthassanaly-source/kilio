"use client";

import { useState, useTransition } from "react";
import { deleteEtiquette, renameEtiquette } from "@/app/actions/documents";
import type { Tables } from "@/lib/supabase/types";
import { dangerButton, errorText, ghostButton, input, listCard, nameText } from "@/lib/ui";

function EtiquetteRow({ etiquette }: { etiquette: Tables<"etiquettes"> }) {
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(etiquette.nom);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await renameEtiquette(etiquette.id, trimmed);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Supprimer l'étiquette « ${etiquette.nom} » ? Les documents ne seront pas supprimés.`)) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteEtiquette(etiquette.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  return (
    <li className={`${listCard} gap-2`}>
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
              setNom(etiquette.nom);
              setEditing(false);
            }}
            className="text-sm text-ink-2 underline"
          >
            Annuler
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2">
          <p className={nameText}>{etiquette.nom}</p>
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

export function EtiquettesManager({ etiquettes }: { etiquettes: Tables<"etiquettes">[] }) {
  if (etiquettes.length === 0) {
    return <p className="text-ink-2">Aucune étiquette pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {etiquettes.map((etiquette) => (
        <EtiquetteRow key={etiquette.id} etiquette={etiquette} />
      ))}
    </ul>
  );
}
