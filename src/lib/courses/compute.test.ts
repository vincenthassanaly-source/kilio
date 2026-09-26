import { describe, expect, it } from "vitest";
import type { Tables } from "@/lib/supabase/types";
import {
  LONGUEUR_MAX_LIBELLE_COURSE,
  PLAFOND_ARTICLES_COURSES,
  cleDoublon,
  compterProgression,
  decouperLibellesMultiples,
  estIdTemporaire,
  grouperItemsCourses,
  planifierAjoutCourses,
  suggererArticles,
  trierCommeServeur,
} from "./compute";

function item(overrides: Partial<Tables<"courses_items">> = {}): Tables<"courses_items"> {
  return {
    id: "id-1",
    libelle: "Lait",
    coche: false,
    created_at: "2026-09-20T10:00:00Z",
    termine_le: null,
    updated_at: "2026-09-20T10:00:00Z",
    ...overrides,
  };
}

describe("grouperItemsCourses", () => {
  it("sépare actifs et archivés en conservant l'ordre d'entrée", () => {
    const a = item({ id: "a", coche: false });
    const b = item({ id: "b", coche: true });
    const c = item({ id: "c", coche: false });
    expect(grouperItemsCourses([a, b, c])).toEqual({ actifs: [a, c], archives: [b] });
  });
});

describe("estIdTemporaire", () => {
  it("reconnaît un id optimiste temp-…", () => {
    expect(estIdTemporaire("temp-abc123")).toBe(true);
  });

  it("rejette un uuid normal", () => {
    expect(estIdTemporaire("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(false);
  });

  it("rejette une valeur non-string", () => {
    expect(estIdTemporaire(undefined)).toBe(false);
    expect(estIdTemporaire(42)).toBe(false);
  });
});

describe("trierCommeServeur", () => {
  it("place les actifs avant les archivés", () => {
    const actif = item({ id: "a", coche: false });
    const archive = item({ id: "b", coche: true });
    expect(trierCommeServeur(actif, archive)).toBeLessThan(0);
    expect(trierCommeServeur(archive, actif)).toBeGreaterThan(0);
  });

  it("trie par created_at décroissant au sein d'un même groupe", () => {
    const plusRecent = item({ id: "a", created_at: "2026-09-25T00:00:00Z" });
    const plusAncien = item({ id: "b", created_at: "2026-09-20T00:00:00Z" });
    expect(trierCommeServeur(plusRecent, plusAncien)).toBeLessThan(0);
  });
});

describe("cleDoublon", () => {
  it("normalise casse, accents et espaces multiples", () => {
    expect(cleDoublon("Café   au Lait")).toBe(cleDoublon("café au lait"));
    expect(cleDoublon("  Pâtes  ")).toBe("pates");
  });

  it("distingue deux libellés réellement différents", () => {
    expect(cleDoublon("Lait")).not.toBe(cleDoublon("Laine"));
  });
});

describe("decouperLibellesMultiples", () => {
  it("découpe sur les retours à la ligne et les ';'", () => {
    const resultat = decouperLibellesMultiples("Lait\nPain;Beurre");
    expect(resultat).toEqual({ ok: true, libelles: ["Lait", "Pain", "Beurre"] });
  });

  it("découpe sur les virgules sauf entre deux chiffres", () => {
    const resultat = decouperLibellesMultiples("1,5 L de lait, Pain");
    expect(resultat).toEqual({ ok: true, libelles: ["1,5 L de lait", "Pain"] });
  });

  it("retire les puces et cases collées depuis une note", () => {
    const resultat = decouperLibellesMultiples("- Lait\n• Pain\n[ ] Beurre\n[x] Œufs\n1. Farine");
    expect(resultat).toEqual({ ok: true, libelles: ["Lait", "Pain", "Beurre", "Œufs", "Farine"] });
  });

  it("dédoublonne en gardant la première occurrence (casse d'origine)", () => {
    const resultat = decouperLibellesMultiples("Lait\nlait\nLAIT");
    expect(resultat).toEqual({ ok: true, libelles: ["Lait"] });
  });

  it("ignore les segments vides", () => {
    const resultat = decouperLibellesMultiples("Lait\n\n\nPain");
    expect(resultat).toEqual({ ok: true, libelles: ["Lait", "Pain"] });
  });

  it("un lot entièrement vide n'est pas une erreur", () => {
    expect(decouperLibellesMultiples("\n;,  \n")).toEqual({ ok: true, libelles: [] });
  });

  it("refuse un lot au-delà du plafond", () => {
    const saisie = Array.from({ length: PLAFOND_ARTICLES_COURSES + 1 }, (_, i) => `Article ${i}`).join("\n");
    const resultat = decouperLibellesMultiples(saisie);
    expect(resultat.ok).toBe(false);
  });

  it("refuse un libellé trop long", () => {
    const resultat = decouperLibellesMultiples("a".repeat(LONGUEUR_MAX_LIBELLE_COURSE + 1));
    expect(resultat.ok).toBe(false);
  });
});

describe("planifierAjoutCourses", () => {
  it("crée un article totalement nouveau", () => {
    expect(planifierAjoutCourses(["Lait"], [])).toEqual({ aCreer: ["Lait"], aReactiver: [], dejaPresents: [] });
  });

  it("ne recrée pas un article déjà actif (même clé insensible casse/accents)", () => {
    const existants = [{ id: "1", libelle: "café", coche: false }];
    expect(planifierAjoutCourses(["Café"], existants)).toEqual({
      aCreer: [],
      aReactiver: [],
      dejaPresents: ["Café"],
    });
  });

  it("réactive un article archivé identique plutôt que d'en créer un nouveau", () => {
    const existants = [{ id: "1", libelle: "Lait", coche: true }];
    expect(planifierAjoutCourses(["Lait"], existants)).toEqual({
      aCreer: [],
      aReactiver: [{ id: "1", libelle: "Lait" }],
      dejaPresents: [],
    });
  });

  it("choisit l'archivé le plus récent en tête de liste quand il y en a plusieurs", () => {
    const existants = [
      { id: "recent", libelle: "Lait", coche: true },
      { id: "ancien", libelle: "Lait", coche: true },
    ];
    expect(planifierAjoutCourses(["Lait"], existants).aReactiver).toEqual([{ id: "recent", libelle: "Lait" }]);
  });

  it("ne planifie qu'une fois un doublon interne au lot", () => {
    const resultat = planifierAjoutCourses(["Lait", "lait", "LAIT"], []);
    expect(resultat.aCreer).toEqual(["Lait"]);
    expect(resultat.dejaPresents).toEqual(["lait", "LAIT"]);
  });
});

describe("suggererArticles", () => {
  const historique = [
    { libelle: "Lait demi-écrémé", coche: true, termine_le: "2026-09-10" },
    { libelle: "Lait demi-écrémé", coche: true, termine_le: "2026-09-20" },
    { libelle: "Lardons", coche: true, termine_le: "2026-09-01" },
    { libelle: "Pain", coche: false, termine_le: null }, // actif : jamais suggéré
  ];

  it("ne suggère que des articles archivés", () => {
    expect(suggererArticles("pai", historique)).toEqual([]);
  });

  it("filtre sur le début du libellé ou d'un de ses mots, insensible casse/accents", () => {
    expect(suggererArticles("la", historique)).toEqual(["Lait demi-écrémé", "Lardons"]);
  });

  it("classe par nombre d'occurrences puis par récence", () => {
    // "Lait demi-écrémé" apparaît 2 fois (occurrences), "Lardons" 1 fois -> Lait d'abord
    const resultat = suggererArticles("l", historique);
    expect(resultat[0]).toBe("Lait demi-écrémé");
  });

  it("renvoie un tableau vide pour un segment vide", () => {
    expect(suggererArticles("   ", historique)).toEqual([]);
  });

  it("respecte le paramètre max", () => {
    const large = [
      { libelle: "Lait", coche: true, termine_le: "2026-09-01" },
      { libelle: "Laine", coche: true, termine_le: "2026-09-01" },
      { libelle: "Laitue", coche: true, termine_le: "2026-09-01" },
    ];
    expect(suggererArticles("la", large, 2)).toHaveLength(2);
  });
});

describe("compterProgression", () => {
  it("compte les actifs restants sur le total", () => {
    const items = [item({ coche: false }), item({ coche: false }), item({ coche: true })];
    expect(compterProgression(items)).toEqual({ actifs: 2, total: 3, tousCoches: false });
  });

  it("détecte 'tousCoches' quand il y a eu des articles et qu'aucun ne reste actif", () => {
    const items = [item({ coche: true }), item({ coche: true })];
    expect(compterProgression(items)).toEqual({ actifs: 0, total: 2, tousCoches: true });
  });

  it("une liste jamais remplie n'est pas 'tousCoches'", () => {
    expect(compterProgression([])).toEqual({ actifs: 0, total: 0, tousCoches: false });
  });
});
