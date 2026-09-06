import { getResultatsFootDuJour } from "@/app/actions/foot";
import { PullToRefresh } from "@/components/PullToRefresh";
import { card, pillTag, screenTitle, sectionTitle } from "@/lib/ui";
import type { MatchFoot } from "@/lib/foot/compute";
import { FootRetryButton } from "./FootRetryButton";

const STATUTS_PAS_ENCORE_COMMENCE = new Set(["NS", "TBD"]);

function LigneMatch({ match }: { match: MatchFoot }) {
  const pasEncoreCommence = STATUTS_PAS_ENCORE_COMMENCE.has(match.statutShort);
  const aUnScore = match.butsDomicile !== null && match.butsExterieur !== null;

  return (
    <div className={`${card} flex items-center justify-between gap-3`}>
      <div className="flex min-w-0 flex-col gap-1">
        <span className="truncate text-[14px] font-semibold text-ink">{match.equipeDomicile}</span>
        <span className="truncate text-[14px] font-semibold text-ink">{match.equipeExterieur}</span>
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

export default async function FootPage() {
  const resultats = await getResultatsFootDuJour();

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Foot</h1>

        {!resultats.ok ? (
          <div className={`${card} flex flex-col items-center gap-3 py-8 text-center`}>
            <p className="text-[13.5px] text-ink-2">{resultats.erreur}</p>
            <FootRetryButton />
          </div>
        ) : resultats.competitions.length === 0 ? (
          <div className={`${card} py-6 text-center`}>
            <p className="text-[13.5px] text-ink-2">Aucun match aujourd&apos;hui dans les compétitions suivies.</p>
          </div>
        ) : (
          resultats.competitions.map(({ competition, matchs }) => (
            <section key={competition.id} className="flex flex-col gap-2.5">
              <h2 className={sectionTitle}>{competition.nom}</h2>
              <div className="flex flex-col gap-2">
                {matchs.map((match) => (
                  <LigneMatch key={match.id} match={match} />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </PullToRefresh>
  );
}
