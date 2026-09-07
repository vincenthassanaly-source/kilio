# Agenda — repères d'heures de travail dans la gouttière de la grille — 2026-09-07

## Contexte

`git fetch origin kilio && git reset --hard origin/kilio` : la branche de travail (`claude/agenda-worktime-gutter-marks-m38b0e`) était déjà strictement à jour sur `origin/kilio` (`8a665a1`, fix bouton retour météo) — aucun rattrapage nécessaire.

Relecture avant modification : `TimeGrid.tsx` (`TimeGutter`, `WorkHoursBand`, `HourLines`, `minutesToPx`/`hourHeight`/`GRID_START_HOUR`), `DayView.tsx`, `WeekView.tsx` (gouttière unique et partagée entre les 7 colonnes de jours), `planning-travail.ts` (`CreneauDuJour`, `getCreneauxDuJour`), `useAgendaZoom.ts` (`GUTTER_WIDTH = 34px`, `BASE_HOUR_HEIGHT`, plage de zoom `[0.2 ou 0.35, 2]`).

## Résumé du changement

Le libellé "HHhMM - HHhMM" affiché en surimpression sur la bande verte `WorkHoursBand` était recouvert dès qu'une tâche (`TacheBlock`) était positionnée sur ce créneau. Le libellé a été déplacé hors de la zone de contenu (colonne scrollable où vivent les tâches) vers la colonne des heures à gauche (`TimeGutter`), à largeur fixe et jamais recouverte par un bloc de tâche puisque c'est une colonne séparée du contenu.

- `WorkHoursBand` redevient un simple aplat de couleur, sans texte.
- Nouveau composant `WorkHoursGutterMarks` : un petit trait + un libellé "HHhMM" dans la gouttière, à chaque début/fin de créneau de travail.

## Avant / après

### `WorkHoursBand`

**Avant** — un `<span>` positionné en bas à droite de la bande via `flex items-end justify-end`, visible seulement si `height >= MIN_LABEL_HEIGHT` :

```tsx
export function WorkHoursBand({ creneaux, zoom, compact = false }) {
  return (
    <>
      {creneaux.map((creneau) => {
        ...
        const height = durationToPx(end - start, zoom);
        return (
          <div
            className="... flex items-end justify-end overflow-hidden rounded-md px-1.5 pb-1"
            style={{ top: minutesToPx(start, zoom), height, backgroundColor: "var(--accent-planning-travail-soft)" }}
          >
            {height >= MIN_LABEL_HEIGHT && (
              <span className={`... ${compact ? "text-[9px]" : "text-[11px]"}`}>
                {formatCreneauHeure(creneau.heure_debut)} - {formatCreneauHeure(creneau.heure_fin)}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}
```

**Après** — plus de texte, plus de `compact`, plus de `MIN_LABEL_HEIGHT` :

```tsx
export function WorkHoursBand({ creneaux, zoom }: { creneaux: CreneauDuJour[]; zoom: number }) {
  return (
    <>
      {creneaux.map((creneau) => {
        ...
        return (
          <div
            key={creneau.id}
            className="pointer-events-none absolute inset-x-0 overflow-hidden rounded-md"
            style={{
              top: minutesToPx(start, zoom),
              height: durationToPx(end - start, zoom),
              backgroundColor: "var(--accent-planning-travail-soft)",
            }}
          />
        );
      })}
    </>
  );
}
```

### `WorkHoursGutterMarks` (nouveau)

```tsx
export function WorkHoursGutterMarks({ creneaux, zoom, compact = false }) {
  // 1. Dédoublonnage par minute de début/fin (Map<minute, label>)
  const labelParMinute = new Map<number, string>();
  for (const creneau of creneaux) {
    const start = heureToMinutes(creneau.heure_debut);
    const end = heureToMinutes(creneau.heure_fin);
    if (start === null || end === null || end <= start) continue;
    if (!labelParMinute.has(start)) labelParMinute.set(start, formatCreneauHeure(creneau.heure_debut));
    if (!labelParMinute.has(end)) labelParMinute.set(end, formatCreneauHeure(creneau.heure_fin));
  }

  // 2. Positions triées, anti-collision contre les heures pleines (noires,
  //    toujours prioritaires) puis entre repères verts déjà retenus
  const marks = [...labelParMinute.entries()]
    .map(([minutes, label]) => ({ minutes, label, top: minutesToPx(minutes, zoom) }))
    .sort((a, b) => a.top - b.top);

  const hourTops = HOURS.map((h) => minutesToPx(h * 60, zoom));
  const visibleTops: number[] = [];
  const visibleMarks = marks.filter((mark) => {
    const collision =
      hourTops.some((top) => Math.abs(top - mark.top) < MIN_GUTTER_MARK_GAP_PX) ||
      visibleTops.some((top) => Math.abs(top - mark.top) < MIN_GUTTER_MARK_GAP_PX);
    if (collision) return false;
    visibleTops.push(mark.top);
    return true;
  });

  // 3. Rendu : trait (2px) + libellé juste au-dessus, dans la gouttière
  return (
    <div className="pointer-events-none absolute inset-0" style={{ width: GUTTER_WIDTH, height: gridHeight(zoom) }}>
      {visibleMarks.map((mark) => (
        <div key={mark.minutes} className="absolute inset-x-0" style={{ top: mark.top }}>
          <span
            className={`absolute right-1 whitespace-nowrap font-semibold text-planning-travail ${compact ? "text-[9px]" : "text-[10px]"}`}
            style={{ transform: "translateY(calc(-100% - 2px))" }}
          >
            {mark.label}
          </span>
          <span className="absolute right-0 h-[2px] w-2 -translate-y-1/2" style={{ backgroundColor: "var(--accent-planning-travail)" }} />
        </div>
      ))}
    </div>
  );
}
```

`formatCreneauHeure` n'a pas eu besoin d'être exportée : `WorkHoursGutterMarks` est défini dans le même fichier `TimeGrid.tsx` que `WorkHoursBand`.

## Intégration

- **`DayView.tsx`** : `TimeGutter` et `WorkHoursGutterMarks` sont désormais tous deux enfants d'un nouveau conteneur `<div className="relative shrink-0" style={{ width: GUTTER_WIDTH, height: gridHeight(zoom) }}>`, avec `WorkHoursGutterMarks` en overlay `absolute inset-0` par-dessus `TimeGutter`. `creneauxJour` (déjà calculé pour la bande) est réutilisé tel quel.
- **`WeekView.tsx`** : même pattern de conteneur autour du `TimeGutter` déjà présent dans la colonne `sticky left-0`. Comme la gouttière est unique pour toute la semaine, une nouvelle liste à plat `creneauxSemaine = days.flatMap((day) => getCreneauxDuJour(creneaux, day, exceptions))` agrège les créneaux des 7 jours avant d'être passée à `WorkHoursGutterMarks` (le dédoublonnage par minute, interne au composant, absorbe les positions partagées par plusieurs jours). `compact` est passé comme pour `WorkHoursBand`.

## Décisions prises

- **Dédoublonnage par minute** (`Map<number, string>` clé = minutes depuis minuit) plutôt que par `id` de créneau : deux créneaux différents (jours différents en Vue Semaine, ou pause déjeuner à la frontière exacte) partageant la même heure de début/fin ne produisent qu'un seul repère, quelle que soit leur origine (récurrent vs exception, jour A vs jour B).
- **Anti-collision à seuil constant en px rendus** (`MIN_GUTTER_MARK_GAP_PX = 10`), **non multiplié par `zoom`** : le texte (`text-[9px]`/`text-[10px]`) a une taille CSS fixe indépendante du zoom, donc le seuil de lisibilité visuelle doit rester une distance à l'écran constante — le multiplier par `zoom` aurait masqué artificiellement plus de repères en dézoomant sans raison (les positions, elles, s'écartent déjà naturellement en dézoomant moins et se resserrent en zoomant moins, via `minutesToPx`). Ce choix diffère légèrement de la formulation littérale du prompt ("~10px à zoom=1, à ajuster proportionnellement") mais suit le même principe que `MIN_LABEL_HEIGHT` (existant, lui aussi non scalé par `zoom`) retiré par ce changement.
- **Priorité aux heures pleines noires** : un repère vert est supprimé s'il tombe à moins de 10px d'une heure pleine existante (`TimeGutter`), jamais l'inverse — les heures pleines restent le repère de référence de la grille.
- **Priorité au premier repère vert rencontré** entre deux repères verts en collision (tri par position croissante, `top` le plus haut retenu en premier) : choix arbitraire mais déterministe, un ordre différent (ex. priorité à l'heure de fin sur l'heure de début) n'apportait pas d'avantage identifiable.
- **Rendu** : trait horizontal 2px de haut × 8px de large (`h-[2px] w-2`), collé au bord droit de la gouttière (`right-0`, à la frontière avec le contenu scrollable), couleur pleine `var(--accent-planning-travail)`. Libellé juste au-dessus du trait (`translateY(calc(-100% - 2px))`), aligné à droite (`right-1`) comme les libellés d'heure pleine existants de `TimeGutter`.

## Limitations connues

- Deux créneaux distincts dont les bornes diffèrent de quelques minutes (ex. 12h00–12h01) ne sont pas dédoublonnés (le dédoublonnage n'agit que sur une égalité exacte à la minute) : l'anti-collision à 10px prend alors le relais et masque le second repère — comportement voulu, mais qui peut occasionnellement supprimer un repère "légitime" très proche d'un autre plutôt que de les fusionner visuellement.
- Le seuil de collision (10px) est une valeur empirique, non recalculée dynamiquement selon la largeur réelle du texte rendu (ex. "9h05" vs "18h30") : un cas limite avec des libellés très larges à `zoom` très faible reste théoriquement possible, non observé en pratique aux valeurs de zoom courantes.
- Vérification visuelle non réalisée dans un navigateur réel dans cette session (pas de rendu disponible) : la logique de positionnement/anti-collision a été relue attentivement et s'appuie sur les mêmes fonctions (`minutesToPx`, `HOURS`) que `TimeGutter`/`HourLines`, déjà correctement alignées entre elles avant ce changement.

## Vérifications (Phase 3)

- `npx tsc --noEmit` : aucune erreur imputable au changement (une seule erreur pré-existante et non liée, `LayoutProps` dans `src/app/layout.tsx`, confirmée présente à l'identique avant modification via `git stash`).
- `npx eslint .` : aucune erreur ni avertissement.
- `npm run build` : build de production réussi (Next.js 16.3.3 / Turbopack), TypeScript strict (avec types de routes générés) passé sans erreur.
