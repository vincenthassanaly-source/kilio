"use client";

import { useState, useTransition } from "react";
import { updateReglagesNettoyage } from "@/app/actions/nettoyage";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useBackClose } from "@/hooks/useBackClose";
import { runAction } from "@/lib/actions/runAction";
import { errorText, input } from "@/lib/ui";

// Ce que la fonction planifiée supprime (supabase/functions/nettoyage-auto,
// constante TABLES) : à tenir aligné avec elle.
const ELEMENTS_NETTOYES = [
  "les tâches et sous-tâches faites",
  "les étapes d'objectif terminées",
  "les articles de courses cochés",
  "les items de notes cochés",
];
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
  // Confirmation avant activation (constat T2 : le réglage s'activait en un
  // tap sans dire qu'il supprime des données chaque jour).
  const [confirmationOuverte, setConfirmationOuverte] = useState(false);
  useBackClose(confirmationOuverte, () => setConfirmationOuverte(false));
  const delaiAffiche = Number(delaiJours) || reglages.delai_jours;

  // Contrat T1 : l'échec revient en message lisible et l'interrupteur
  // reprend sa position précédente.
  function persister(nextActif: boolean, nextDelaiJours: number, precedentActif: boolean) {
    setError(null);
    startTransition(async () => {
      await runAction(() => updateReglagesNettoyage(nextActif, nextDelaiJours), {
        silencieux: true,
        erreur: "Le réglage n'a pas pu être enregistré. Réessaie.",
        onError: (message) => {
          setError(message);
          setActif(precedentActif);
        },
      });
    });
  }

  function toggle() {
    if (!actif) {
      setConfirmationOuverte(true);
      return;
    }
    setActif(false);
    persister(false, delaiAffiche, true);
  }

  function confirmerActivation() {
    setActif(true);
    persister(true, delaiAffiche, false);
    history.back();
  }

  function validerDelai() {
    const parsed = Number(delaiJours);
    if (!Number.isInteger(parsed) || parsed < 1) {
      setDelaiJours(String(reglages.delai_jours));
      return;
    }
    persister(actif, parsed, actif);
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
          aria-label="Nettoyage automatique des éléments terminés"
          className="relative h-[26px] w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kcal focus-visible:ring-offset-2"
          // Piste éteinte bordée par --control-border (≥ 3:1, T5).
          style={{
            background: actif ? "var(--accent-kcal)" : "var(--surface-alt)",
            boxShadow: actif ? undefined : "inset 0 0 0 1.5px var(--control-border)",
          }}
        >
          <span
            className="absolute top-0.5 h-[22px] w-[22px] rounded-full bg-white transition-[left]"
            style={{ left: actif ? "20px" : "2px" }}
          />
        </button>
      </div>
      <p className="text-[12.5px] leading-snug text-ink-2">
        {actif
          ? `Chaque jour, supprime définitivement ce qui est terminé depuis plus de ${delaiAffiche} jour${delaiAffiche > 1 ? "s" : ""} : tâches, sous-tâches, étapes d'objectif, courses et items de notes.`
          : "Désactivé : rien n'est supprimé automatiquement."}
      </p>
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
      {error && (
        <p role="alert" className={errorText}>
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmationOuverte}
        titre="Activer le nettoyage automatique ?"
        confirmer="Activer le nettoyage"
        onConfirm={confirmerActivation}
        onClose={() => history.back()}
      >
        <p>
          Une fois par jour, Kilio supprimera <strong className="text-ink">définitivement</strong> ce qui est terminé
          depuis plus de {delaiAffiche} jour{delaiAffiche > 1 ? "s" : ""} :
        </p>
        <ul className="list-disc pl-5 text-ink">
          {ELEMENTS_NETTOYES.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <p>Les éléments en cours ne sont jamais touchés. Le délai reste modifiable ensuite.</p>
      </ConfirmDialog>
    </div>
  );
}
