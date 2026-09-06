"use client";

import { useRef, useState, useTransition } from "react";
import {
  ajouterEtape,
  deplacerEtape,
  supprimerEtape,
  toggleEtape,
} from "@/app/actions/objectifs";
import type { Tables } from "@/lib/supabase/types";
import { card, dangerButton, ghostButton, input, sectionTitle } from "@/lib/ui";
import { CheckToggle } from "@/components/CheckToggle";
import { vibrate } from "@/lib/haptics";

export function ObjectifSuiviEtapes({
  objectifId,
  etapes,
}: {
  objectifId: string;
  etapes: Tables<"objectif_etapes">[];
}) {
  const [isPending, startTransition] = useTransition();
  const [titre, setTitre] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const faites = etapes.filter((e) => e.fait).length;

  function handleAjouter(formData: FormData) {
    const valeur = String(formData.get("titre") ?? "");
    if (!valeur.trim()) return;
    startTransition(async () => {
      await ajouterEtape(objectifId, valeur);
      setTitre("");
      formRef.current?.reset();
    });
  }

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <h2 className={sectionTitle}>Étapes</h2>
        <span className="text-[13px] text-ink-2">
          {faites}/{etapes.length}
        </span>
      </div>

      {etapes.length === 0 ? (
        <p className="text-ink-2">Aucune étape pour l&apos;instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {etapes.map((etape, index) => (
            <li key={etape.id} className="flex items-center gap-2">
              <CheckToggle
                checked={etape.fait}
                disabled={isPending}
                onToggle={() => {
                  vibrate();
                  startTransition(() => toggleEtape(objectifId, etape.id, !etape.fait));
                }}
                color="var(--accent-objectifs)"
                label={etape.fait ? "Marquer non fait" : "Marquer fait"}
              />
              <span className={`flex-1 text-[14.5px] text-ink ${etape.fait ? "text-ink-2 line-through" : ""}`}>
                {etape.titre}
              </span>
              <button
                type="button"
                disabled={isPending || index === 0}
                onClick={() => startTransition(() => deplacerEtape(objectifId, etape.id, "haut"))}
                className={`${ghostButton} px-2 py-1 disabled:opacity-30`}
                aria-label="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={isPending || index === etapes.length - 1}
                onClick={() => startTransition(() => deplacerEtape(objectifId, etape.id, "bas"))}
                className={`${ghostButton} px-2 py-1 disabled:opacity-30`}
                aria-label="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => supprimerEtape(objectifId, etape.id))}
                className={`${dangerButton} px-2 py-1`}
              >
                Suppr.
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={handleAjouter}
        className="flex gap-2"
      >
        <input
          name="titre"
          placeholder="Nouvelle étape…"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          className={`${input} flex-1`}
        />
        <button type="submit" disabled={isPending} className={ghostButton}>
          Ajouter
        </button>
      </form>
    </div>
  );
}
