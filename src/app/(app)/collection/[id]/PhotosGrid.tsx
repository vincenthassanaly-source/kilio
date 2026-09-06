"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { deleteCollectionItem } from "@/app/actions/collections";
import { ImageLightbox } from "@/components/ImageLightbox";
import type { Tables } from "@/lib/supabase/types";

export function PhotosGrid({
  photos,
  collectionId,
}: {
  photos: Tables<"collection_items">[];
  collectionId: string;
}) {
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (photos.length === 0) {
    return <p className="text-ink-2">Aucune photo pour l&apos;instant.</p>;
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-2">
        <AnimatePresence initial={false}>
          {photos.map((photo, index) => (
            <motion.li
              key={photo.id}
              layout
              className="relative aspect-square overflow-hidden rounded-2xl bg-surface-alt"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.3) }}
            >
              <button
                type="button"
                onClick={() => setLightboxSrc(photo.url)}
                aria-label="Agrandir la photo"
                className="block h-full w-full"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- image issue du bucket Storage public collection-images, affichée telle quelle sans optimisation next/image */}
                <img
                  src={photo.url}
                  alt=""
                  style={index === 0 ? { viewTransitionName: `collection-cover-${collectionId}` } : undefined}
                  className="h-full w-full object-cover"
                />
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => deleteCollectionItem(photo.id))}
                aria-label="Supprimer la photo"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </>
  );
}
