import { getResultatsFootFenetre } from "@/app/actions/foot";
import { PullToRefresh } from "@/components/PullToRefresh";
import { card, screenTitle } from "@/lib/ui";
import { dateDuJourParis } from "@/lib/foot/compute";
import { FootRetryButton } from "./FootRetryButton";
import { FootDayNavigator } from "./FootDayNavigator";

export default async function FootPage() {
  const resultats = await getResultatsFootFenetre();

  return (
    <PullToRefresh>
      <div className="flex flex-col gap-4">
        <h1 className={screenTitle}>Foot</h1>

        {!resultats.ok ? (
          <div className={`${card} flex flex-col items-center gap-3 py-8 text-center`}>
            <p className="text-[13.5px] text-ink-2">{resultats.erreur}</p>
            <FootRetryButton />
          </div>
        ) : (
          <FootDayNavigator
            jours={resultats.jours}
            aujourdhuiISO={dateDuJourParis()}
            erreursPartielles={resultats.erreursPartielles}
          />
        )}
      </div>
    </PullToRefresh>
  );
}
