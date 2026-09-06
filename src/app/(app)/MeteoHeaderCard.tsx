import { getMeteoJour } from "@/app/actions/meteo";
import { MeteoHeaderWidget } from "./MeteoHeaderWidget";

// Server Component async indépendant, streamé via son propre <Suspense> dans
// page.tsx (voir reports/2026-09-04-dashboard-streaming-par-section.md) :
// n'affecte jamais le rendu statique et instantané du reste du header.
export async function MeteoHeaderCard() {
  const meteo = await getMeteoJour();
  if (!meteo) return null;

  return <MeteoHeaderWidget meteo={meteo} />;
}
