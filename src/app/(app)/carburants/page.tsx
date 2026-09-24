import { CarburantsView } from "./CarburantsView";

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Contrairement aux autres modules, tout le fetch de données se fait côté
// client (voir CarburantsView) : il dépend de la géolocalisation navigateur,
// indisponible côté Server Component.
export default function CarburantsPage() {
  return <CarburantsView />;
}
