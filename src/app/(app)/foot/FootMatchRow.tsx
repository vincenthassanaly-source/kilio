"use client";

import { useState } from "react";
import { card, pillTag } from "@/lib/ui";
import type { MatchFoot } from "@/lib/foot/compute";

const STATUTS_PAS_ENCORE_COMMENCE = new Set(["NS", "TBD"]);

function LogoEquipe({ src, nom }: { src: string | null; nom: string }) {
  const [casse, setCasse] = useState(false);
  if (!src || casse) return <span className="h-5 w-5 shrink-0" aria-hidden />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- logos distants API-Football, hôte non ajouté à next.config (voir rapport)
    <img
      src={src}
      alt=""
      width={20}
      height={20}
      loading="lazy"
      className="h-5 w-5 shrink-0 object-contain"
      onError={() => setCasse(true)}
      title={nom}
    />
  );
}

export function FootMatchRow({ match }: { match: MatchFoot }) {
  const pasEncoreCommence = STATUTS_PAS_ENCORE_COMMENCE.has(match.statutShort);
  const aUnScore = match.butsDomicile !== null && match.butsExterieur !== null;

  return (
    <div className={`${card} flex items-center justify-between gap-3`}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <LogoEquipe src={match.logoDomicile} nom={match.equipeDomicile} />
          <span className="truncate text-[14px] font-semibold text-ink">{match.equipeDomicile}</span>
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <LogoEquipe src={match.logoExterieur} nom={match.equipeExterieur} />
          <span className="truncate text-[14px] font-semibold text-ink">{match.equipeExterieur}</span>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1">
        {aUnScore ? (
          <div className="flex flex-col items-end font-display font-bold text-ink">
            <span className="text-[15px] leading-tight">{match.butsDomicile}</span>
            <span className="text-[15px] leading-tight">{match.butsExterieur}</span>
          </div>
        ) : (
          <span className="text-[13px] font-semibold text-ink-2">{match.heureLabel}</span>
        )}

        {match.statut.enDirect ? (
          <span className="shrink-0 rounded-full bg-alert/10 px-2.5 py-1 text-[11px] font-bold text-alert">
            🔴 {match.elapsed != null ? `${match.elapsed}'` : match.statut.label}
          </span>
        ) : !pasEncoreCommence ? (
          <span className={pillTag}>{match.statut.label}</span>
        ) : null}
      </div>
    </div>
  );
}
