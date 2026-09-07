"use server";

import Parser from "rss-parser";
import { trierParDateDesc, type Article } from "@/lib/actu/compute";

const NB_ARTICLES_PAR_SECTION = 8;

type SourceRss = { nom: string; url: string };

// Le Monde et France Info sont confirmées actives (vérifiées par Vincent).
const SOURCES_GENERALE: SourceRss[] = [
  { nom: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml" },
  { nom: "France Info", url: "https://www.francetvinfo.fr/titres.rss" },
];

// ANSM n'expose pas de flux "actualités générales" : son système RSS est
// organisé par domaine médical (voir https://ansm.sante.fr/page/flux-rss,
// ex. .../rss/informations_securite?domainesMedicaux=cardiologie). L'URL
// ci-dessous omet ce filtre pour récupérer les alertes de sécurité tous
// domaines confondus — c'est le seul flux ANSM disponible sans être
// restreint à une seule spécialité. Non vérifiée par un fetch de test
// (session sans accès réseau sortant vers ce domaine) : à confirmer après
// déploiement, voir reports/2026-09-07-module-actualite.md.
const SOURCES_PHARMA: SourceRss[] = [{ nom: "ANSM", url: "https://ansm.sante.fr/rss/informations_securite" }];

export type ResultatActu = {
  generale: Article[];
  pharma: Article[];
  erreursSources: string[];
};

const parser = new Parser({ timeout: 10_000 });

async function chargerSource(source: SourceRss): Promise<{ articles: Article[]; erreur: string | null }> {
  try {
    const res = await fetch(source.url, { next: { revalidate: 1800 } });
    if (!res.ok) {
      return { articles: [], erreur: `${source.nom} indisponible (code ${res.status})` };
    }

    const xml = await res.text();
    const feed = await parser.parseString(xml);

    const articles: Article[] = (feed.items ?? [])
      .filter((item) => item.title && item.link)
      .map((item) => ({
        titre: item.title!,
        lien: item.link!,
        source: source.nom,
        datePublication: item.isoDate ?? item.pubDate ?? "",
        resume: item.contentSnippet ?? item.summary,
      }));

    return { articles, erreur: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { articles: [], erreur: `${source.nom} indisponible (${message})` };
  }
}

async function chargerSection(sources: SourceRss[]): Promise<{ articles: Article[]; erreurs: string[] }> {
  const resultats = await Promise.allSettled(sources.map(chargerSource));

  const articles: Article[] = [];
  const erreurs: string[] = [];
  for (const resultat of resultats) {
    if (resultat.status === "fulfilled") {
      articles.push(...resultat.value.articles);
      if (resultat.value.erreur) erreurs.push(resultat.value.erreur);
    } else {
      erreurs.push(resultat.reason instanceof Error ? resultat.reason.message : String(resultat.reason));
    }
  }

  return { articles: trierParDateDesc(articles).slice(0, NB_ARTICLES_PAR_SECTION), erreurs };
}

/** Fetch en parallèle des flux RSS générale + pharma. Chaque flux est
 * indépendant (Promise.allSettled) : un flux en panne n'empêche jamais
 * l'affichage des autres, il apparaît juste dans `erreursSources`. */
export async function getActu(): Promise<ResultatActu> {
  const [generale, pharma] = await Promise.all([chargerSection(SOURCES_GENERALE), chargerSection(SOURCES_PHARMA)]);

  return {
    generale: generale.articles,
    pharma: pharma.articles,
    erreursSources: [...generale.erreurs, ...pharma.erreurs],
  };
}
