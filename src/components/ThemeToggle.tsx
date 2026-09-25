"use client";

import { basculerTheme } from "@/lib/theme";

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5v2M12 18.5v2M4.5 12h2M17.5 12h2M6.5 6.5l1.4 1.4M16.1 16.1l1.4 1.4M6.5 17.5l1.4-1.4M16.1 7.9l1.4-1.4" />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.8 6.8 0 0 0 20 14.5z" />
    </svg>
  );
}

const toggleTheme = basculerTheme;

/** Bouton rond pour basculer clair/sombre. Persisté en localStorage ET en
 * cookie (lu en priorité par themeInitScript avant le premier paint — plus
 * robuste que le seul localStorage, qui peut être purgé sous pression de
 * stockage en PWA), appliqué via la classe `dark` sur <html>
 * (voir lib/theme.ts pour le script anti-flash). Les deux icônes sont
 * rendues côté serveur, la classe `dark:` choisit laquelle afficher : pas
 * d'état React, donc pas de flash ni de mismatch d'hydratation. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Basculer le thème clair/sombre"
      // Zone de tap étendue à 44 px (pattern `zoneTap44Icone` de ui.ts) sans
      // grossir le bouton visible (36 px) : ce bouton flottant isolé n'a
      // aucun voisin avec qui la zone étendue pourrait chevaucher.
      className={`relative after:absolute after:-inset-1 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink shadow-card ${className}`}
    >
      <span className="dark:hidden">
        <SunIcon />
      </span>
      <span className="hidden dark:block">
        <MoonIcon />
      </span>
    </button>
  );
}
