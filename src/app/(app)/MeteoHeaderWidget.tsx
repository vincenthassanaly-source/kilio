"use client";

import { useState } from "react";
import { pillTag } from "@/lib/ui";
import { interpreterCodeMeteo } from "@/lib/meteo/compute";
import type { MeteoJour } from "@/app/actions/meteo";
import { useBackClose } from "@/hooks/useBackClose";
import { MeteoDetailModal } from "./MeteoDetailModal";

export function MeteoHeaderWidget({ meteo }: { meteo: MeteoJour }) {
  const [isOpen, setIsOpen] = useState(false);
  useBackClose(isOpen, () => setIsOpen(false));
  const aujourdhui = meteo.journees[0];
  const { label, icone } = interpreterCodeMeteo(meteo.codeMeteoActuel);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label={`Météo : ${label}, ${aujourdhui.tempMin}° / ${aujourdhui.tempMax}°`}
        className={`${pillTag} flex items-center gap-1 transition-transform active:scale-95`}
      >
        <span>{icone}</span>
        <span>
          {aujourdhui.tempMin}°/{aujourdhui.tempMax}°
        </span>
      </button>

      {isOpen && <MeteoDetailModal meteo={meteo} onClose={() => setIsOpen(false)} />}
    </>
  );
}
