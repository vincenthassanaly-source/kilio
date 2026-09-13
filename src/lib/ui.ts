// Shared Tailwind class fragments for the "Kilio — mobile" design system.
// Keeps cards/buttons/inputs visually consistent across screens.

export const card = "rounded-[22px] border border-line bg-surface p-4 shadow-card";
// `cardTight` : toujours une ligne de liste (un ingrédient, une étape, une
// entrée de journal...), jamais un conteneur groupant plusieurs éléments
// indépendants — press state ajouté sans risque de doublon avec un enfant.
// `card` (ci-dessus), lui, sert aussi bien de conteneur de groupe (ex.
// DashboardTachesSection, qui rassemble plusieurs tâches sous un seul
// conteneur `card`) que de formulaire (Add*Toggle) : y ajouter
// `active:scale` ferait "trembler" tout le groupe/formulaire au moindre tap
// sur un champ ou un bouton interne, pas seulement l'élément pressé — non
// modifié ici pour cette raison (voir reports/2026-09-13-fluidite-4-chantiers.md).
export const cardTight = "rounded-[20px] border border-line bg-surface p-3.5 shadow-card transition active:scale-[0.97]";
export const heroCard = "rounded-3xl border border-line bg-surface p-[18px] shadow-card";

export const screenTitle = "font-display text-2xl font-bold text-ink tracking-tight";
export const sectionTitle = "text-[15px] font-bold text-ink";
export const eyebrow = "text-[12.5px] font-semibold text-ink-3";

// `focus-visible:ring-*` (jamais `focus:`, pour ne pas afficher l'anneau au
// clic souris/tap) : anneau détaché du fond (`ring-offset-2`) donc visible
// quel que soit le fond du bouton, y compris sur `primaryButton` (bg-kcal).
const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kcal focus-visible:ring-offset-2";

export const input = `rounded-2xl border border-line bg-surface-alt px-3.5 py-2.5 text-[15px] text-ink outline-none focus:border-kcal/60 transition-colors ${focusRing}`;
export const label = "text-sm font-medium text-ink";
export const errorText = "text-sm text-alert";

export const primaryButton =
  `rounded-2xl bg-kcal px-4 py-2.5 font-semibold text-white transition active:scale-[0.97] disabled:opacity-60 ${focusRing}`;
export const secondaryButton =
  `rounded-2xl border border-line bg-surface px-4 py-2.5 font-semibold text-ink transition active:scale-[0.97] disabled:opacity-60 ${focusRing}`;
export const addCard =
  `flex w-full items-center gap-[13px] rounded-[22px] border border-line bg-surface p-4 shadow-card text-left transition-transform active:scale-[0.99] ${focusRing}`;
export const addCardIcon =
  "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] text-white text-lg font-semibold";

export const ghostButton =
  `rounded-xl border border-line px-2.5 py-1.5 text-sm font-medium text-ink transition active:scale-[0.97] hover:bg-surface-alt ${focusRing}`;
export const dangerButton =
  `rounded-xl border border-alert/30 px-2.5 py-1.5 text-sm font-medium text-alert transition active:scale-[0.97] disabled:opacity-60 ${focusRing}`;
export const linkButton = `text-sm font-semibold text-kcal ${focusRing}`;

export const iconButton =
  `flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink ${focusRing}`;

export const pillTag =
  "shrink-0 rounded-full bg-surface-alt px-2.5 py-1 text-[11px] font-semibold text-ink-2";
export const kcalPillTag =
  "shrink-0 rounded-full bg-kcal-soft px-2.5 py-1 text-[11px] font-bold text-kcal";

// Toujours une ligne de liste représentant une seule entité (une tâche, un
// objectif, une transaction...), jamais un groupe : même raisonnement que
// `cardTight` ci-dessus.
export const listCard =
  "flex flex-col gap-1.5 rounded-[20px] border border-line bg-surface p-3.5 shadow-card transition active:scale-[0.97]";

export const checkCircle =
  "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2";

export const nameText = "text-[14.5px] font-semibold text-ink truncate";
export const metaText = "text-xs text-ink-2 font-mono";
