"use client";

import { useEffect, useRef, useState } from "react";
import { card, sectionTitle } from "@/lib/ui";
import { formatEtiquetteJour, type JourFoot } from "@/lib/foot/compute";
import { FootMatchRow } from "./FootMatchRow";

export function FootDayNavigator({
  jours,
  aujourdhuiISO,
  erreursPartielles,
}: {
  jours: JourFoot[];
  aujourdhuiISO: string;
  erreursPartielles: string[];
}) {
  const [dateSelectionnee, setDateSelectionnee] = useState(aujourdhuiISO);
  const chipAujourdhuiRef = useRef<HTMLButtonElement>(null);

  // Centre "Aujourd'hui" dans la bande de dates au premier rendu, sans
  // animation visible (scrollIntoView déclenché avant peinture utile).
  useEffect(() => {
    chipAujourdhuiRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, []);

  const jourSelectionne = jours.find((j) => j.dateISO === dateSelectionnee) ?? jours[Math.floor(jours.length / 2)];

  return (
    <div className="flex flex-col gap-4">
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" style={{ scrollbarWidth: "none" }}>
        {jours.map((jour) => {
          const estAujourdhui = jour.dateISO === aujourdhuiISO;
          const estSelectionne = jour.dateISO === dateSelectionnee;
          return (
            <button
              key={jour.dateISO}
              ref={estAujourdhui ? chipAujourdhuiRef : undefined}
              type="button"
              onClick={() => setDateSelectionnee(jour.dateISO)}
              className="shrink-0 rounded-2xl border px-3.5 py-2 text-[12.5px] font-semibold transition-colors"
              style={
                estSelectionne
                  ? { background: "var(--accent-foot)", borderColor: "var(--accent-foot)", color: "white" }
                  : { background: "var(--surface)", borderColor: "var(--line)", color: "var(--ink-2)" }
              }
            >
              {estAujourdhui ? "Aujourd'hui" : formatEtiquetteJour(jour.dateISO)}
            </button>
          );
        })}
      </div>

      {erreursPartielles.length > 0 && (
        <p className="text-[12px] text-ink-3">
          Certaines compétitions n&apos;ont pas pu être chargées : {erreursPartielles.join(" · ")}
        </p>
      )}

      {jourSelectionne.competitions.length === 0 ? (
        <div className={`${card} py-6 text-center`}>
          <p className="text-[13.5px] text-ink-2">Aucun match ce jour-là dans les compétitions suivies.</p>
        </div>
      ) : (
        jourSelectionne.competitions.map(({ competition, matchs }) => (
          <section key={competition.id} className="flex flex-col gap-2.5">
            <h2 className={sectionTitle}>{competition.nom}</h2>
            <div className="flex flex-col gap-2">
              {matchs.map((match) => (
                <FootMatchRow key={match.id} match={match} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
