import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { calculerStreak, jourPrecedent } from "./compute";

// Régression : l'ancien code construisait `new Date(`${date}T00:00:00`)`
// (sans `Z`), interprété en heure locale du process. Avec TZ=Europe/Paris
// (UTC+2 en septembre), minuit local converti en UTC retombait sur la
// veille, donc même le jour demandé n'était plus trouvé dans la Map —
// streak cassé dès le premier jour. On force ce fuseau ici pour vérifier
// que le calcul reste correct indépendamment du fuseau du serveur.
describe("calculerStreak (fuseau horaire)", () => {
  const TZ_ORIGINAL = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Europe/Paris";
  });

  afterEach(() => {
    process.env.TZ = TZ_ORIGINAL;
  });

  it("compte le jour demandé même quand le serveur tourne en heure de Paris", () => {
    const entries = new Map([
      ["2026-09-24", 1],
      ["2026-09-25", 1],
      ["2026-09-26", 1],
    ]);

    expect(calculerStreak(entries, "2026-09-26")).toBe(3);
  });

  it("s'arrête au premier jour manquant", () => {
    const entries = new Map([
      ["2026-09-25", 1],
      ["2026-09-26", 1],
    ]);

    expect(calculerStreak(entries, "2026-09-26")).toBe(2);
  });

  it("renvoie 0 quand le jour demandé n'a pas d'entrée", () => {
    const entries = new Map([["2026-09-25", 1]]);

    expect(calculerStreak(entries, "2026-09-26")).toBe(0);
  });

  it("jourPrecedent reste correct autour d'un changement de mois", () => {
    expect(jourPrecedent("2026-10-01")).toBe("2026-09-30");
  });
});
