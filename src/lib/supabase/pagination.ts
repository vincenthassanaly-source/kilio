/**
 * PostgREST plafonne les réponses à 1000 lignes par défaut : au-delà, une
 * requête `.select()` sans pagination renvoie une page tronquée sans lever
 * d'erreur (silencieux). Cette fonction récupère toutes les lignes par pages
 * de `pageSize`, à utiliser pour toute requête dont le nombre de lignes n'est
 * pas borné par ailleurs (filtre de date, `.limit()` explicite...).
 */
export async function fetchAllRows<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  pageSize = 1000
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw new Error(error.message);

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}
