"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { useState, useTransition } from "react";
import { deleteCollection, renameCollection } from "@/app/actions/collections";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import type { Tables } from "@/lib/supabase/types";
import { dangerButton, errorText, ghostButton, input, linkButton } from "@/lib/ui";

export function CollectionHeader({ collection }: { collection: Tables<"collections"> }) {
  const router = useRouter();
  const navigate = useViewTransitionNavigate();
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState(collection.nom);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = nom.trim();
    if (!trimmed) return;

    setError(null);
    startTransition(async () => {
      try {
        await renameCollection(collection.id, trimmed);
        setEditing(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  function handleDelete() {
    if (!window.confirm(`Supprimer la collection « ${collection.nom} » et toutes ses photos ?`)) return;

    setError(null);
    startTransition(async () => {
      try {
        await deleteCollection(collection.id);
        router.push("/collection");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur inconnue.");
      }
    });
  }

  function handleBackClick(e: MouseEvent<HTMLAnchorElement>) {
    // Ne bloque la navigation native de <Link> que si l'API View Transitions
    // est disponible : sinon Next.js gère la navigation comme avant.
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      e.preventDefault();
      navigate("/collection");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Link href="/collection" onClick={handleBackClick} className={linkButton}>
        ‹ Collection
      </Link>

      <div className="flex items-start justify-between gap-3">
        {editing ? (
          <form onSubmit={handleRename} className="flex flex-1 items-center gap-2">
            <input
              autoFocus
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className={`${input} flex-1`}
            />
            <button type="submit" disabled={isPending} className={ghostButton}>
              OK
            </button>
          </form>
        ) : (
          <h1
            style={{ viewTransitionName: `collection-title-${collection.id}` }}
            className="mt-1 truncate font-display text-[22px] font-semibold text-ink"
          >
            {collection.nom}
          </h1>
        )}

        <div className="flex shrink-0 gap-2">
          {!editing && (
            <button type="button" onClick={() => setEditing(true)} className={ghostButton}>
              Renommer
            </button>
          )}
          <button type="button" disabled={isPending} onClick={handleDelete} className={dangerButton}>
            Suppr.
          </button>
        </div>
      </div>

      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
