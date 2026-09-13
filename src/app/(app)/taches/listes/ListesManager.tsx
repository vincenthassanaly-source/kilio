"use client";

import { useState, useTransition } from "react";
import { deleteListe, reordonnerListes } from "@/app/actions/taches";
import type { Tables } from "@/lib/supabase/types";
import { dangerButton, ghostButton, listCard, nameText } from "@/lib/ui";
import { confirmDelete } from "@/lib/confirm";
import { AddListeForm } from "./AddListeForm";

function ListeRow({
  liste,
  index,
  total,
}: {
  liste: Tables<"listes_taches">;
  index: number;
  total: number;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <li className={listCard}>
        <AddListeForm liste={liste} onDone={() => setEditing(false)} />
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

  function handleDelete() {
    if (!confirmDelete(`Supprimer la liste « ${liste.nom} » ?`)) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteListe(liste.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur inconnue.");
      }
    });
  }

  return (
    <li className={`${listCard} gap-2`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {liste.couleur && (
            <span
              className="h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: liste.couleur }}
            />
          )}
          <p className={nameText}>{liste.nom}</p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={isPending || index === 0}
            onClick={() => startTransition(() => reordonnerListes(liste.id, "haut"))}
            className="text-ink-2 disabled:opacity-30"
            aria-label="Monter"
          >
            ↑
          </button>
          <button
            type="button"
            disabled={isPending || index === total - 1}
            onClick={() => startTransition(() => reordonnerListes(liste.id, "bas"))}
            className="text-ink-2 disabled:opacity-30"
            aria-label="Descendre"
          >
            ↓
          </button>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
          Modifier
        </button>
        {liste.nom !== "Général" && (
          <button type="button" disabled={isPending} onClick={handleDelete} className={dangerButton}>
            Suppr.
          </button>
        )}
      </div>
      {error && <p className="text-sm text-alert">{error}</p>}
    </li>
  );
}

export function ListesManager({ listes }: { listes: Tables<"listes_taches">[] }) {
  if (listes.length === 0) {
    return <p className="text-ink-2">Aucune liste pour l&apos;instant.</p>;
  }

  return (
    <ul className="flex flex-col gap-2.5">
      {listes.map((liste, index) => (
        <ListeRow key={liste.id} liste={liste} index={index} total={listes.length} />
      ))}
    </ul>
  );
}
