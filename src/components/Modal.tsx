"use client";

import type { ReactNode } from "react";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col rounded-t-[22px] border border-line bg-surface shadow-card sm:rounded-[22px] sm:mb-6"
        onClick={(e) => e.stopPropagation()}
        // Empêche un geste tactile dans la modale (ex. défilement horizontal
        // d'un contenu interne) de remonter jusqu'au <main> de TabSwipeWrapper
        // et d'y être interprété comme un swipe de navigation entre onglets.
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-3.5">
          <span className="text-[15px] font-bold text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-2 transition-colors hover:bg-surface-alt"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <div
          className="overflow-y-auto px-4 pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 20px)" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
