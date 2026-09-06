"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { deleteRecette } from "@/app/actions/recettes";
import type { Tables } from "@/lib/supabase/types";
import { TransitionLink } from "@/components/TransitionLink";
import { card, dangerButton, errorText, ghostButton, linkButton } from "@/lib/ui";

const RecetteForm = dynamic(() => import("../RecetteForm").then((m) => m.RecetteForm), { ssr: false });

const SOURCE_LABEL: Record<string, string> = {
  manuel: "Manuel",
  hellofresh: "HelloFresh",
};

export function RecetteHeader({
  recette,
}: {
  recette: Tables<"recettes">;
}) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (editing) {
    return (
      <div className={card}>
        <RecetteForm recette={recette} onDone={() => setEditing(false)} />
        <button type="button" onClick={() => setEditing(false)} className="mt-2 text-sm text-ink-2 underline">
          Annuler
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <TransitionLink href="/nutrition/recettes" className={linkButton}>
        ‹ Recettes
      </TransitionLink>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mt-1 truncate font-display text-[22px] font-semibold text-ink">
            {recette.nom}
          </h1>
          <p className="text-[13px] text-ink-2">
            {SOURCE_LABEL[recette.source]}
            {recette.temps_prepa_min != null ? ` · ${recette.temps_prepa_min} min` : ""}
            {" · "}
            {recette.portions} portion{recette.portions > 1 ? "s" : ""}
          </p>
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
                  await deleteRecette(recette.id);
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
      {recette.description && <p className="text-sm text-ink">{recette.description}</p>}
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
