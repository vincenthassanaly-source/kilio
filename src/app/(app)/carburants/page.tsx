import { CarburantsView } from "./CarburantsView";

// Contrairement aux autres modules, tout le fetch de données se fait côté
// client (voir CarburantsView) : il dépend de la géolocalisation navigateur,
// indisponible côté Server Component.
export default function CarburantsPage() {
  return <CarburantsView />;
}
