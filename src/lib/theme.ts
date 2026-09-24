export const THEME_STORAGE_KEY = "kilio-theme";
export const THEME_COOKIE_KEY = "kilio-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

// Injecté en inline script dans <head> pour appliquer la classe `dark` avant
// le premier paint (évite le flash de thème clair). Seul point d'application
// du thème au chargement : le layout racine ne lit plus le cookie côté
// serveur, pour rester dans la coquille statique (Cache Components). Le
// script étant synchrone et placé avant <body>, la classe est posée avant
// tout rendu, comme l'était la classe SSR. Priorité inchangée : cookie >
// localStorage > préférence système.
export const themeInitScript = `
(function () {
  try {
    var match = document.cookie.match(/(?:^|; )${THEME_COOKIE_KEY}=([^;]*)/);
    var stored = match ? match[1] : localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;
