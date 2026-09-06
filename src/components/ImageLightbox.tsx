"use client";

import { useState } from "react";
import { useBackClose } from "@/hooks/useBackClose";
import { FadeInImage } from "@/components/FadeInImage";

/** Overlay plein écran pour agrandir une image au tap. Fermeture au tap
 * n'importe où (y compris sur l'image, cf. object-contain qui laisse de
 * l'espace vide autour) ou sur le bouton ×. Générique, pas spécifique au
 * module Tâches. */
export function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  const [downloading, setDownloading] = useState(false);

  // Ce composant n'est monté que pendant que le lightbox est ouvert : `active`
  // vaut donc toujours true tant qu'il existe dans l'arbre.
  useBackClose(true, onClose);

  async function handleDownload(event: React.MouseEvent) {
    event.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const lastSegment = src.split("/").pop()?.split("?")[0];
      const filename = lastSegment && lastSegment.length > 0 ? lastSegment : `kilio-photo-${Date.now()}.jpg`;
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(src, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80" onClick={onClose}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        aria-label="Télécharger"
        className="absolute right-16 top-[calc(env(safe-area-inset-top)+16px)] flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white disabled:opacity-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="absolute inset-4">
        <FadeInImage src={src} alt="" fill sizes="100vw" className="object-contain" />
      </div>
    </div>
  );
}
