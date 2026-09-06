"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/** Wrapper autour de next/image ajoutant un fondu à l'arrivée de l'image
 * (pas de blur-up : aucune miniature n'est stockée en base pour l'instant). */
export function FadeInImage({ alt, className, onLoad, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <Image
      {...props}
      alt={alt}
      className={`${className ?? ""} transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
      onLoad={(event) => {
        setLoaded(true);
        onLoad?.(event);
      }}
    />
  );
}
