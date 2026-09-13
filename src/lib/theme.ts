export const THEME_STORAGE_KEY = "kilio-theme";
export const THEME_COOKIE_KEY = "kilio-theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 an

// Injecté en inline script dans <head> pour appliquer la classe `dark` avant
// le premier paint (évite le flash de thème clair). Filet de sécurité pour
// les cas où le cookie n'est pas encore disponible côté serveur (première
// visite) : le cookie est déjà appliqué en SSR par layout.tsx, donc ce
// script ne fait la différence qu'en son absence. Priorité : cookie (déjà
// posé en SSR) > localStorage > préférence système.
export const themeInitScript = `
(function () {
  try {
    var cookiePresent = document.cookie.indexOf(${JSON.stringify(THEME_COOKIE_KEY + "=")}) !== -1;
    if (cookiePresent) return;
    var stored = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var dark = stored ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;
