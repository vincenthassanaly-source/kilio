import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bornesPeriode,
  calculerProchaineOccurrence,
  finDeLAnnee,
  finDeLaSemaine,
  finDuMois,
  formatMontant,
  formatPeriode,
  grilleCalendrierMois,
  normaliserPeriode,
  periodeAdjacente,
  periodeParDefaut,
  premierJourDeLAnnee,
  premierJourDeLaSemaine,
  premierJourDuMois,
  regrouperParCategorieParente,
  statutBudget,
} from "./compute";

describe("regrouperParCategorieParente", () => {
  it("attache chaque sous-catégorie à son parent", () => {
    const categories = [
      { id: "courses", categorie_parent_id: null },
      { id: "resto", categorie_parent_id: "courses" },
      { id: "sport", categorie_parent_id: null },
    ];
    expect(regrouperParCategorieParente(categories)).toEqual([
      { parent: { id: "courses", categorie_parent_id: null }, sousCategories: [{ id: "resto", categorie_parent_id: "courses" }] },
      { parent: { id: "sport", categorie_parent_id: null }, sousCategories: [] },
    ]);
  });
});

describe("statutBudget", () => {
  it("est 'ok' sous le seuil de 80%", () => {
    expect(statutBudget(50, 100)).toBe("ok");
  });

  it("est 'proche' à partir de 80%", () => {
    expect(statutBudget(80, 100)).toBe("proche");
  });

  it("est 'depasse' au-delà de 100%", () => {
    expect(statutBudget(101, 100)).toBe("depasse");
  });

  it("une cible <= 0 avec une dépense est un dépassement (rien n'était prévu)", () => {
    expect(statutBudget(10, 0)).toBe("depasse");
  });

  it("une cible <= 0 sans dépense reste 'ok'", () => {
    expect(statutBudget(0, 0)).toBe("ok");
  });
});

describe("formatMontant", () => {
  it("formate en euros avec la locale fr-FR", () => {
    expect(formatMontant(12.5)).toContain("12,50");
    expect(formatMontant(12.5)).toContain("€");
  });
});

describe("premierJourDuMois / finDuMois", () => {
  it("renvoie le 1er du mois de la date donnée", () => {
    expect(premierJourDuMois(new Date(2026, 8, 26))).toBe("2026-09-01");
  });

  it("finDuMois est le 1er du mois suivant (borne exclusive)", () => {
    expect(finDuMois("2026-09-01")).toBe("2026-10-01");
  });

  it("finDuMois franchit correctement un changement d'année", () => {
    expect(finDuMois("2026-12-01")).toBe("2027-01-01");
  });
});

describe("premierJourDeLaSemaine / finDeLaSemaine", () => {
  it("un jeudi retombe sur le lundi de la même semaine", () => {
    // 2026-09-24 est un jeudi
    expect(premierJourDeLaSemaine(new Date(2026, 8, 24))).toBe("2026-09-21");
  });

  it("un dimanche retombe sur le lundi de la même semaine (pas la semaine suivante)", () => {
    // 2026-09-27 est un dimanche, appartient à la semaine du lundi 2026-09-21
    expect(premierJourDeLaSemaine(new Date(2026, 8, 27))).toBe("2026-09-21");
  });

  it("un lundi est son propre premier jour de semaine", () => {
    expect(premierJourDeLaSemaine(new Date(2026, 8, 21))).toBe("2026-09-21");
  });

  it("finDeLaSemaine est le lundi suivant (borne exclusive, +7 jours)", () => {
    expect(finDeLaSemaine("2026-09-21")).toBe("2026-09-28");
  });

  it("finDeLaSemaine franchit correctement un changement de mois", () => {
    expect(finDeLaSemaine("2026-09-28")).toBe("2026-10-05");
  });
});

describe("premierJourDeLAnnee / finDeLAnnee", () => {
  it("renvoie le 1er janvier de l'année de la date donnée", () => {
    expect(premierJourDeLAnnee(new Date(2026, 8, 26))).toBe("2026-01-01");
  });

  it("finDeLAnnee est le 1er janvier de l'année suivante", () => {
    expect(finDeLAnnee("2026-01-01")).toBe("2027-01-01");
  });
});

describe("periodeParDefaut", () => {
  beforeEach(() => {
    // Jeudi 2026-09-24 (heure de Paris, été -> UTC+2).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T10:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hebdomadaire -> lundi de la semaine en cours", () => {
    expect(periodeParDefaut("hebdomadaire")).toBe("2026-09-21");
  });

  it("mensuel -> 1er du mois en cours", () => {
    expect(periodeParDefaut("mensuel")).toBe("2026-09-01");
  });

  it("annuel -> 1er janvier de l'année en cours", () => {
    expect(periodeParDefaut("annuel")).toBe("2026-01-01");
  });
});

describe("bornesPeriode", () => {
  it("délègue vers finDuMois pour une période mensuelle", () => {
    expect(bornesPeriode("2026-09-01", "mensuel")).toEqual({ debut: "2026-09-01", fin: "2026-10-01" });
  });

  it("délègue vers finDeLaSemaine pour une période hebdomadaire", () => {
    expect(bornesPeriode("2026-09-21", "hebdomadaire")).toEqual({ debut: "2026-09-21", fin: "2026-09-28" });
  });

  it("délègue vers finDeLAnnee pour une période annuelle", () => {
    expect(bornesPeriode("2026-01-01", "annuel")).toEqual({ debut: "2026-01-01", fin: "2027-01-01" });
  });
});

describe("periodeAdjacente", () => {
  it("avance d'une semaine", () => {
    expect(periodeAdjacente("2026-09-21", "hebdomadaire", 1)).toBe("2026-09-28");
  });

  it("recule d'un mois", () => {
    expect(periodeAdjacente("2026-09-01", "mensuel", -1)).toBe("2026-08-01");
  });

  it("avance d'une année", () => {
    expect(periodeAdjacente("2026-01-01", "annuel", 1)).toBe("2027-01-01");
  });
});

describe("formatPeriode", () => {
  it("formate un mois", () => {
    expect(formatPeriode("2026-09-01", "mensuel")).toBe("septembre 2026");
  });

  it("formate une semaine avec la date du lundi", () => {
    expect(formatPeriode("2026-09-21", "hebdomadaire")).toBe("Semaine du 21 septembre 2026");
  });

  it("formate une année", () => {
    expect(formatPeriode("2026-01-01", "annuel")).toBe("Année 2026");
  });
});

describe("grilleCalendrierMois", () => {
  it("complète la première et la dernière semaine avec les jours hors-mois", () => {
    // Septembre 2026 : le 1er est un mardi, le 30 un mercredi.
    const grille = grilleCalendrierMois("2026-09-01");

    expect(grille[0][0]).toEqual({ date: "2026-08-31", horsMois: true }); // lundi de padding
    expect(grille[0][1]).toEqual({ date: "2026-09-01", horsMois: false });
    const derniereSemaine = grille[grille.length - 1];
    expect(derniereSemaine.at(-1)).toEqual({ date: "2026-10-04", horsMois: true }); // dimanche de padding
  });

  it("chaque semaine a exactement 7 jours", () => {
    const grille = grilleCalendrierMois("2026-09-01");
    for (const semaine of grille) expect(semaine).toHaveLength(7);
  });

  it("ne duplique ni n'omet aucun jour du mois", () => {
    const grille = grilleCalendrierMois("2026-02-01"); // février, mois court
    const joursDuMois = grille.flat().filter((j) => !j.horsMois);
    expect(joursDuMois).toHaveLength(28); // 2026 n'est pas bissextile
  });
});

describe("calculerProchaineOccurrence", () => {
  it("quotidien avance d'un jour", () => {
    expect(calculerProchaineOccurrence("2026-09-24", "quotidien")).toBe("2026-09-25");
  });

  it("hebdomadaire avance de 7 jours", () => {
    expect(calculerProchaineOccurrence("2026-09-24", "hebdomadaire")).toBe("2026-10-01");
  });

  it("mensuel se cale sur le dernier jour du mois cible quand le jour d'origine n'existe pas", () => {
    // 31 janvier + 1 mois -> pas de 31 février, date-fns cale sur le dernier jour (28, 2026 non bissextile)
    expect(calculerProchaineOccurrence("2026-01-31", "mensuel")).toBe("2026-02-28");
  });

  it("annuel gère le 29 février d'une année bissextile vers une année non bissextile", () => {
    expect(calculerProchaineOccurrence("2024-02-29", "annuel")).toBe("2025-02-28");
  });

  it("mensuel franchit correctement un changement d'année", () => {
    expect(calculerProchaineOccurrence("2026-12-15", "mensuel")).toBe("2027-01-15");
  });
});

describe("normaliserPeriode", () => {
  it("recale une période mensuelle sur le premier du mois", () => {
    expect(normaliserPeriode("2026-09-17", "mensuel")).toBe("2026-09-01");
  });

  it("recale une période hebdomadaire sur le lundi de la semaine", () => {
    // 2026-09-17 est un jeudi -> lundi 2026-09-14
    expect(normaliserPeriode("2026-09-17", "hebdomadaire")).toBe("2026-09-14");
  });

  it("recale une période annuelle sur le 1er janvier", () => {
    expect(normaliserPeriode("2026-09-17", "annuel")).toBe("2026-01-01");
  });

  it("renvoie null pour un format invalide", () => {
    expect(normaliserPeriode("abc", "mensuel")).toBeNull();
    expect(normaliserPeriode("2026-9-1", "mensuel")).toBeNull();
    expect(normaliserPeriode("", "mensuel")).toBeNull();
  });

  it("renvoie null pour une date calendaire invalide plutôt que de déborder sur le mois suivant", () => {
    expect(normaliserPeriode("2026-02-30", "mensuel")).toBeNull();
    expect(normaliserPeriode("2026-13-01", "mensuel")).toBeNull();
  });
});
