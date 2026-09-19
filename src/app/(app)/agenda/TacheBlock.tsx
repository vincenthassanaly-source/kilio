"use client";

import type { Tables } from "@/lib/supabase/types";
import { formatHeureHHMM, getBlocInterval, type PositionColonne } from "@/lib/agenda/compute";
import { getTacheBlockStyle } from "./TimeGrid";

// Bloc de tâche partagé entre DayView (plein format, cliquable) et WeekView
// (`compact`, non cliquable : le tap y ouvre déjà le jour via le bouton
// parent — un <button> imbriqué serait invalide en HTML).
export const PRIORITE_BLOCK_CLASS: Record<Tables<"taches">["priorite"], string> = {
  aucune: "bg-surface-alt text-ink",
  basse: "bg-agenda/15 text-agenda",
  moyenne: "bg-carbs/15 text-carbs",
  haute: "bg-alert/15 text-alert",
};

// Écart visuel entre deux blocs voisins lorsqu'ils se partagent la largeur
// de la grille (chevauchement, cf. layoutChevauchements) : appliqué de
// façon identique de chaque côté de chaque colonne (y compris en bord de
// grille) pour une formule simple et un espacement régulier.
const COLUMN_GAP_PX = 2;

export type TacheBlocInfo = {
  id: string;
  titre: string;
  heure: string | null;
  heure_fin: string | null;
  priorite: Tables<"taches">["priorite"];
};

function horizontalStyle(position?: PositionColonne): React.CSSProperties | undefined {
  if (!position || position.nbColonnes <= 1) return undefined;
  const { colonne, nbColonnes } = position;
  return {
    left: `calc(${(colonne / nbColonnes) * 100}% + ${COLUMN_GAP_PX / 2}px)`,
    width: `calc(${(1 / nbColonnes) * 100}% - ${COLUMN_GAP_PX}px)`,
  };
}

export function TacheBlock({
  tache,
  zoom,
  position,
  compact = false,
  onSelect,
}: {
  tache: TacheBlocInfo;
  zoom: number;
  // Colonne assignée par layoutChevauchements en cas de chevauchement avec
  // d'autres blocs du même jour ; absent (ou nbColonnes 1) = pleine largeur,
  // rendu strictement identique à avant l'introduction du chevauchement.
  position?: PositionColonne;
  // Vue Semaine : bloc compact (texte plus petit, pas d'heure de fin dans le
  // libellé affiché). Vue Jour (défaut) : bloc pleine taille avec la plage
  // horaire complète.
  compact?: boolean;
  // Vue Jour uniquement : tap = surbrillance + scroll vers la TaskCard (cf.
  // AgendaView.onSelectTache). Absent en Semaine, voir note ci-dessus.
  onSelect?: (id: string) => void;
}) {
  const style = getTacheBlockStyle(tache, zoom);
  if (!style) return null;

  const insetClass = position && position.nbColonnes > 1 ? "" : compact ? "inset-x-0.5" : "inset-x-1";
  const sizingClass = compact
    ? "rounded-md px-1 py-0.5 text-[10px]"
    : "rounded-lg px-2 py-1 text-[12px] shadow-sm";
  const className = `absolute overflow-hidden ${insetClass} ${sizingClass} leading-tight font-semibold ${PRIORITE_BLOCK_CLASS[tache.priorite]}`;
  const blockStyle: React.CSSProperties = {
    top: style.top,
    height: style.height,
    ...horizontalStyle(position),
  };

  const heureDebut = tache.heure?.slice(0, 5);
  const label = compact
    ? `${heureDebut ?? ""} ${tache.titre}`
    : tache.heure_fin
      ? `${heureDebut} – ${tache.heure_fin.slice(0, 5)} ${tache.titre}`
      : `${heureDebut} ${tache.titre}`;

  if (!onSelect) {
    return (
      <div className={className} style={blockStyle}>
        <span className="block truncate">{label}</span>
      </div>
    );
  }

  // La plage annoncée reprend toujours les bornes effectives du bloc (même
  // durée par défaut de 30 min que le rendu, cf. getBlocInterval), pour
  // qu'un lecteur d'écran annonce une fin même sans `heure_fin` saisie.
  const interval = getBlocInterval(tache);
  const ariaLabel = interval
    ? `${tache.titre}, de ${formatHeureHHMM(interval.start)} à ${formatHeureHHMM(interval.end)}`
    : tache.titre;

  return (
    <button
      type="button"
      onClick={() => onSelect(tache.id)}
      className={`${className} text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-agenda`}
      style={blockStyle}
      aria-label={ariaLabel}
    >
      <span className="block truncate" aria-hidden>
        {label}
      </span>
    </button>
  );
}
