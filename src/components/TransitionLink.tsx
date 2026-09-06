"use client";

import Link from "next/link";
import { forwardRef } from "react";
import type { ComponentProps, MouseEvent } from "react";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";

type TransitionLinkProps = ComponentProps<typeof Link>;

/**
 * Wrapper fin autour de `next/link` qui déclenche le crossfade View
 * Transitions (voir `useViewTransitionNavigate`) sur les navigateurs qui le
 * supportent, tout en restant un `<Link>` par ailleurs : mêmes props, ref
 * transmise (compatible dnd-kit) et navigation native de Next.js inchangée
 * en fallback. Si l'`onClick` fourni par l'appelant fait déjà
 * `e.preventDefault()` (ex. `ModuleTile` en mode édition), la transition
 * n'est pas déclenchée.
 */
export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ href, onClick, ...props }, ref) {
    const navigate = useViewTransitionNavigate();

    function handleClick(e: MouseEvent<HTMLAnchorElement>) {
      onClick?.(e);
      if (e.defaultPrevented) return;

      const hrefString = typeof href === "string" ? href : null;
      if (hrefString && typeof document !== "undefined" && "startViewTransition" in document) {
        e.preventDefault();
        navigate(hrefString);
      }
    }

    return <Link ref={ref} href={href} onClick={handleClick} {...props} />;
  }
);
