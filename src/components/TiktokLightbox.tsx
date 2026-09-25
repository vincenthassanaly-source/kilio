"use client";

import { useEffect, useState, useRef } from "react";
import { useBackClose } from "@/hooks/useBackClose";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { Portal } from "@/components/Portal";
import { extraireIdVideoTiktok } from "@/lib/collection/tiktok";

/** Overlay plein écran de lecture d'une vidéo TikTok, sur le modèle
 * d'ImageLightbox : lecture directe via l'iframe d'embed officiel, pas de
 * téléchargement ni de stockage de la vidéo elle-même. */
export function TiktokLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  const [videoId, setVideoId] = useState<string | null>(null);
  const [erreur, setErreur] = useState(false);

  // Ce composant n'est monté que pendant que le lightbox est ouvert : `active`
  // vaut donc toujours true tant qu'il existe dans l'arbre.
  useBackClose(true, onClose);
  // T14 : focus piégé dans l'overlay, Échap ferme, focus rendu à la fermeture.
  const overlayRef = useRef<HTMLDivElement>(null);
  useDialogFocus(overlayRef, onClose);

  useEffect(() => {
    let annule = false;
    extraireIdVideoTiktok(url).then((id) => {
      if (annule) return;
      if (id) setVideoId(id);
      else setErreur(true);
    });
    return () => {
      annule = true;
    };
  }, [url]);

  // Rendu dans un portal (T14) : plus déformé par l'`active:scale` d'une
  // carte parente (DocumentCard, grilles de Collection).
  return (
    <Portal>
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Vidéo TikTok"
      className="fixed inset-0 z-50 bg-black outline-none"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="flex h-full w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {videoId ? (
          <iframe
            src={`https://www.tiktok.com/embed/v2/${videoId}`}
            title="Vidéo TikTok"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="h-full max-h-[85dvh] w-full max-w-[420px] border-0"
          />
        ) : erreur ? (
          <p className="px-6 text-center text-sm text-white/80">Impossible de charger cette vidéo TikTok.</p>
        ) : (
          <p className="px-6 text-center text-sm text-white/60">Chargement…</p>
        )}
      </div>
    </div>
    </Portal>
  );
}
