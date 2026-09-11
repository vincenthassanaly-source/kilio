"use client";

import { useState, useTransition } from "react";
import { updateReglagesNettoyage } from "@/app/actions/nettoyage";
import { errorText, input } from "@/lib/ui";
import type { Tables } from "@/lib/supabase/types";

function formatDerniereExecution(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function NettoyageAutoRow({ reglages }: { reglages: Tables<"reglages_nettoyage"> }) {
  const [actif, setActif] = useState(reglages.actif);
  const [delaiJours, setDelaiJours] = useState(String(reglages.delai_jours));
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function persister(nextActif: boolean, nextDelaiJours: number) {
    setError(null);
    startTransition(async () => {
      try {
        await updateReglagesNettoyage(nextActif, nextDelaiJours);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour du réglage.");
      }
    });
  }

  function toggle() {
    const next = !actif;
    setActif(next);
    persister(next, Number(delaiJours) || reglages.delai_jours);
  }

  function validerDelai() {
    const parsed = Number(delaiJours);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setDelaiJours(String(reglages.delai_jours));
      return;
    }
    persister(actif, parsed);
  }

  return (
    <div className="flex flex-col gap-2.5 border-t border-line py-3.5">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-ink">Nettoyage automatique</span>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={actif}
          className="relative h-[26px] w-11 rounded-full transition-colors"
          style={{ background: actif ? "var(--accent-kcal)" : "var(--surface-alt)" }}
        >
          <span
            className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-all"
            style={{ left: actif ? "20px" : "2px" }}
          />
        </button>
      </div>
      {actif && (
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-ink-2">Supprimer les items faits après (jours)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={delaiJours}
            onChange={(e) => setDelaiJours(e.target.value)}
            onBlur={validerDelai}
            className={`${input} w-16 py-1.5 text-center text-[13px]`}
          />
        </div>
      )}
      {reglages.derniere_execution && (
        <p className="text-xs text-ink-3">Dernier nettoyage : {formatDerniereExecution(reglages.derniere_execution)}</p>
      )}
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
