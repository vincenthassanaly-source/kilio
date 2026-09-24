import { connection } from "next/server";

// Date du jour (YYYY-MM-DD) côté serveur : donnée de requête, lue après
// connection() pour ne jamais être figée dans la coquille statique au build.
// Appelée par chaque composant qui en a besoin, sous son propre <Suspense>,
// jamais dans le corps d'une page (voir
// reports/2026-09-24-navigation-instantanee-cache-components.md).
export async function getToday(): Promise<string> {
  await connection();
  return new Date().toISOString().slice(0, 10);
}
