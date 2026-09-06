"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { CollectionMosaic } from "./CollectionMosaic";
import type { CollectionAvecApercu } from "@/app/actions/collections";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import { nameText } from "@/lib/ui";

export function CollectionsGrid({ collections }: { collections: CollectionAvecApercu[] }) {
  const navigate = useViewTransitionNavigate();

  if (collections.length === 0) {
    return <p className="text-ink-2">Aucune collection pour l&apos;instant.</p>;
  }

  function handleClick(e: MouseEvent<HTMLAnchorElement>, href: string) {
    // Ne bloque la navigation native de <Link> que si l'API View Transitions
    // est disponible : sinon Next.js gère la navigation comme avant.
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      e.preventDefault();
      navigate(href);
    }
  }

  return (
    <ul className="columns-2 gap-3">
      {collections.map((collection, index) => (
        <motion.li
          key={collection.id}
          className="mb-3 break-inside-avoid"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: Math.min(index * 0.035, 0.35) }}
          whileTap={{ scale: 0.97 }}
        >
          <Link
            href={`/collection/${collection.id}`}
            onClick={(e) => handleClick(e, `/collection/${collection.id}`)}
            className="flex flex-col gap-1.5"
          >
            <CollectionMosaic
              photos={collection.photos_apercu}
              viewTransitionName={`collection-cover-${collection.id}`}
            />
            <p className={nameText} style={{ viewTransitionName: `collection-title-${collection.id}` }}>
              {collection.nom}
            </p>
            <p className="text-xs text-ink-3">
              {collection.nb_photos} photo{collection.nb_photos > 1 ? "s" : ""}
            </p>
          </Link>
        </motion.li>
      ))}
    </ul>
  );
}
