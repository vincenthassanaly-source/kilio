"use client";

import { useState, useTransition } from "react";
import {
  deleteEtiquette,
  updateEtiquette,
  type TypeChampsEtiquette,
} from "@/app/actions/documents";
import { TYPE_CHAMPS_LABELS } from "../champs";
import type { Tables } from "@/lib/supabase/types";
import { dangerButton, errorText, ghostButton, input, listCard, metaText, nameText } from "@/lib/ui";

function EtiquetteRow({ etiquette }: { etiquette: Tables<"etiquettes"> }) {
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(etiquette.nom);
  const [typeChamps, setTypeChamps] = useState(etiquette.type_champs as TypeChampsEtiquette);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await updateEtiquette(etiquette.id, trimmed, typeChamps);
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

  if (editing) {
    return (
      <li className={`${listCard} gap-2`}>
        <form onSubmit={handleSave} className="flex flex-col gap-2">
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            autoFocus
            className={`${input} py-1.5`}
          />
          <select
            value={typeChamps}
            onChange={(e) => setTypeChamps(e.target.value as TypeChampsEtiquette)}
            className={`${input} py-1.5`}
          >
            {(Object.keys(TYPE_CHAMPS_LABELS) as TypeChampsEtiquette[]).map((key) => (
              <option key={key} value={key}>
                {TYPE_CHAMPS_LABELS[key]}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button type="submit" disabled={isPending} className={ghostButton}>
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => {
                setNom(etiquette.nom);
                setTypeChamps(etiquette.type_champs as TypeChampsEtiquette);
                setEditing(false);
              }}
              className="text-sm text-ink-2 underline"
            >
              Annuler
            </button>
          </div>
        </form>
        {error && <p className={errorText}>{error}</p>}
      </li>
    );
  }

  return (
    <li className={`${listCard} gap-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <p className={nameText}>{etiquette.nom}</p>
          <span className={metaText}>{TYPE_CHAMPS_LABELS[etiquette.type_champs as TypeChampsEtiquette]}</span>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
            Modifier
          </button>
          <button type="button" disabled={isPending} onClick={handleDelete} className={dangerButton}>
            Suppr.
          </button>
        </div>
      </div>
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
