"use client";

import { useId, type ReactNode } from "react";
import { motion } from "framer-motion";
import { SEGMENT_CADRE, segmentClasse } from "@/lib/segmented";

// Contrôle segmenté partagé (constat T7 de l'audit du 2026-09-25) : il était
// réimplémenté dans une dizaine d'écrans avec des couleurs d'actif
// différentes (carbs, carburants, habitudes…), sans `aria-pressed` ni
// anneau de focus. Conforme à DESIGN.md : pilule `surface-alt`, onglets
// `rounded-xl`, actif en `bg-kcal` (The One Accent Rule) avec `text-on-kcal`
// (lisible en sombre, T4), cibles de 44 px (T6).
//
// Les variantes « lien » (sous-navigation, bascule Repos/Entraînement) ne
// sont pas des boutons : elles réutilisent `SEGMENT_CADRE` et
// `segmentClasse` (lib/segmented.ts, module neutre appelable côté serveur).

export type SegmentOption<T extends string> = { value: T; label: ReactNode; ariaLabel?: string };

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  name,
  taille = "md",
  glissant = false,
  className = "",
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Nom du groupe, annoncé par les lecteurs d'écran. */
  ariaLabel: string;
  /** Dans un formulaire : publie la valeur sous ce nom (champ caché). */
  name?: string;
  taille?: "md" | "sm";
  /** Pastille active qui glisse d'un segment à l'autre (framer-motion). */
  glissant?: boolean;
  className?: string;
}) {
  const pastilleId = useId();

  return (
    <div className={`${SEGMENT_CADRE} ${className}`} role="group" aria-label={ariaLabel}>
      {name && <input type="hidden" name={name} value={value} />}
      {options.map((option) => {
        const actif = option.value === value;
        if (!glissant) {
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={actif}
              aria-label={option.ariaLabel}
              onClick={() => onChange(option.value)}
              className={segmentClasse(actif, taille)}
            >
              {option.label}
            </button>
          );
        }
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={actif}
            aria-label={option.ariaLabel}
            onClick={() => onChange(option.value)}
            className={segmentClasse(false, taille).replace("text-ink-2 hover:text-ink", "")}
          >
            {actif && (
              <motion.span
                layoutId={pastilleId}
                aria-hidden="true"
                className="absolute inset-0 rounded-xl bg-kcal"
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
              />
            )}
            <span className={`relative transition-colors ${actif ? "text-on-kcal" : "text-ink-2"}`}>
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
