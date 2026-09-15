"use client";

import { useState, useTransition } from "react";
import { updateReglagesNettoyage } from "@/app/actions/nettoyage";
import { errorText, input } from "@/lib/ui";
import type { Tables } from "@/lib/supabase/types";

function NettoyageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-kcal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 7h14" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" />
      <path d="M6.5 7l.8 11a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.8-11" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

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
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2.5 text-[14px] font-medium text-ink">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "color-mix(in oklch, var(--accent-kcal) 12%, transparent)" }}
          >
            <NettoyageIcon />
          </span>
          Nettoyage automatique
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-pressed={actif}
          aria-label="Activer le nettoyage automatique"
          className="relative h-[26px] w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kcal focus-visible:ring-offset-2"
          style={{ background: actif ? "var(--accent-kcal)" : "var(--surface-alt)" }}
        >
          <span
            className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-[left]"
            style={{ left: actif ? "20px" : "2px" }}
          />
        </button>
      </div>
      {actif && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[13px] text-ink-2">Supprimer les items faits après (jours)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={delaiJours}
            onChange={(e) => setDelaiJours(e.target.value)}
            onBlur={validerDelai}
            className={`${input} w-16 shrink-0 py-1.5 text-center text-[13px]`}
          />
        </div>
      )}
      {reglages.derniere_execution && (
        <p className="text-xs text-ink-3">
          Dernier nettoyage : {formatDerniereExecution(reglages.derniere_execution)}
        </p>
      )}
      {error && <p className={errorText}>{error}</p>}
    </div>
  );
}
