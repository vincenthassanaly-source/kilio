"use client";

import { useBackClose } from "@/hooks/useBackClose";
import { extraireIdVideoYoutube } from "@/lib/collection/youtube";

/** Overlay plein écran de lecture d'une vidéo YouTube, sur le modèle
 * d'ImageLightbox : lecture directe via l'iframe d'embed officiel, pas de
 * téléchargement ni de stockage de la vidéo elle-même. */
export function YoutubeLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  // Contrairement à TikTok, l'id est lisible directement dans l'URL : pas
  // de résolution asynchrone, donc pas d'état de chargement.
  const videoId = extraireIdVideoYoutube(url);

  // Ce composant n'est monté que pendant que le lightbox est ouvert : `active`
  // vaut donc toujours true tant qu'il existe dans l'arbre.
  useBackClose(true, onClose);

  return (
    <div className="fixed inset-0 z-50 bg-black" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fermer"
        className="absolute right-4 top-[calc(env(safe-area-inset-top)+16px)] z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="flex h-full w-full items-center justify-center" onClick={(e) => e.stopPropagation()}>
        {videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
            title="Vidéo YouTube"
            allow="autoplay; encrypted-media; fullscreen"
            allowFullScreen
            className="aspect-video max-h-[85vh] w-full max-w-[960px] border-0"
          />
        ) : (
          <p className="px-6 text-center text-sm text-white/80">Impossible de charger cette vidéo YouTube.</p>
        )}
      </div>
    </div>
  );
}
