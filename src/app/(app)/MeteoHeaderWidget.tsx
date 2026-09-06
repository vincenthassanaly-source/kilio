"use client";

import { useState } from "react";
import { pillTag } from "@/lib/ui";
import { interpreterCodeMeteo } from "@/lib/meteo/compute";
import type { MeteoJour } from "@/app/actions/meteo";
import { MeteoDetailModal } from "./MeteoDetailModal";

export function MeteoHeaderWidget({ meteo }: { meteo: MeteoJour }) {
  const [isOpen, setIsOpen] = useState(false);
  const { label, icone } = interpreterCodeMeteo(meteo.codeMeteo);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Météo : ${label}, ${meteo.tempMin}° / ${meteo.tempMax}°`}
        className={`${pillTag} flex items-center gap-1 transition-transform active:scale-95`}
      >
        <span>{icone}</span>
        <span>
          {meteo.tempMin}°/{meteo.tempMax}°
        </span>
      </button>

      {isOpen && <MeteoDetailModal meteo={meteo} onClose={() => setIsOpen(false)} />}
    </>
  );
}
