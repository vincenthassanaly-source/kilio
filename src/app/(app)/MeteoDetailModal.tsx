"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { eyebrow, pillTag, iconButton } from "@/lib/ui";
import { interpreterCodeMeteo, labelJournee } from "@/lib/meteo/compute";
import type { MeteoJour } from "@/app/actions/meteo";

export function MeteoDetailModal({ meteo, onClose }: { meteo: MeteoJour; onClose: () => void }) {
  const [dayIndex, setDayIndex] = useState(0);
  const journee = meteo.journees[dayIndex];
  const estAujourdhui = dayIndex === 0;
  const { label, icone } = interpreterCodeMeteo(estAujourdhui ? meteo.codeMeteoActuel : journee.codeMeteo);

  return (
    <Modal title="Météo — Marseille" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setDayIndex((i) => Math.max(0, i - 1))}
            disabled={dayIndex === 0}
            aria-label="Jour précédent"
            className={`${iconButton} disabled:opacity-30`}
          >
            ‹
          </button>
          <span className={`${eyebrow} capitalize`}>{labelJournee(journee.date, dayIndex)}</span>
          <button
            type="button"
            onClick={() => setDayIndex((i) => Math.min(meteo.journees.length - 1, i + 1))}
            disabled={dayIndex === meteo.journees.length - 1}
            aria-label="Jour suivant"
            className={`${iconButton} disabled:opacity-30`}
          >
            ›
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-4xl">{icone}</span>
          <div className="flex flex-col">
            <span className="text-[22px] font-bold text-ink">
              {estAujourdhui ? `${meteo.tempActuelle}°` : `${journee.tempMin}° / ${journee.tempMax}°`}
            </span>
            <span className="text-[13px] text-ink-2">{label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-surface-alt p-2.5">
            <span className={eyebrow}>Ressenti</span>
            <span className="text-[13px] font-semibold text-ink">
              {journee.ressentiMin}°/{journee.ressentiMax}°
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-surface-alt p-2.5">
            <span className={eyebrow}>Vent</span>
            <span className="text-[13px] font-semibold text-ink">
              {estAujourdhui ? meteo.ventActuel : journee.vent} km/h
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-surface-alt p-2.5">
            <span className={eyebrow}>Humidité</span>
            <span className="text-[13px] font-semibold text-ink">
              {estAujourdhui ? meteo.humiditeActuelle : journee.humidite}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={eyebrow}>{estAujourdhui ? "Prochaines heures" : "Heures de la journée"}</span>
          <div className="flex gap-2 overflow-x-auto pb-1" data-swipe-ignore>
            {journee.previsionsHoraires.map((prevision) => {
              const { icone: iconePrevision } = interpreterCodeMeteo(prevision.code);
              return (
                <div
                  key={prevision.heure}
                  className="flex shrink-0 flex-col items-center gap-1 rounded-2xl border border-line bg-surface-alt px-3 py-2.5"
                >
                  <span className="text-[11px] font-semibold text-ink-3">{prevision.heure}</span>
                  <span className="text-lg">{iconePrevision}</span>
                  <span className={pillTag}>{prevision.temp}°</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
