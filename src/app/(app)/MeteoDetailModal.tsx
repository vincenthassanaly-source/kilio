"use client";

import { Modal } from "@/components/Modal";
import { eyebrow, pillTag } from "@/lib/ui";
import { interpreterCodeMeteo } from "@/lib/meteo/compute";
import type { MeteoJour } from "@/app/actions/meteo";

export function MeteoDetailModal({ meteo, onClose }: { meteo: MeteoJour; onClose: () => void }) {
  const { label, icone } = interpreterCodeMeteo(meteo.codeMeteo);

  return (
    <Modal title="Météo — Marseille" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{icone}</span>
          <div className="flex flex-col">
            <span className="text-[22px] font-bold text-ink">{meteo.tempActuelle}°</span>
            <span className="text-[13px] text-ink-2">{label}</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-surface-alt p-2.5">
            <span className={eyebrow}>Ressenti</span>
            <span className="text-[13px] font-semibold text-ink">
              {meteo.ressentiMin}°/{meteo.ressentiMax}°
            </span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-surface-alt p-2.5">
            <span className={eyebrow}>Vent</span>
            <span className="text-[13px] font-semibold text-ink">{meteo.vent} km/h</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 rounded-2xl border border-line bg-surface-alt p-2.5">
            <span className={eyebrow}>Humidité</span>
            <span className="text-[13px] font-semibold text-ink">{meteo.humidite}%</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className={eyebrow}>Prochaines heures</span>
          <div className="flex gap-2 overflow-x-auto pb-1" data-swipe-ignore>
            {meteo.previsionsHoraires.map((prevision) => {
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
