"use client";

import { useEffect, useRef } from "react";
import { renderBlockie } from "~~/services/usb/blockies";

/** The same 8x8 picture the wallet draws for this seed. `scale` px per cell; the wallet uses 8 for a
 *  digest on the sign screen and 10 for the account on its home screen. */
export const Blockie = ({
  seed,
  scale = 8,
  className = "",
  title,
}: {
  seed: string;
  scale?: number;
  className?: string;
  title?: string;
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) renderBlockie(ref.current, seed, scale);
  }, [seed, scale]);
  return (
    <canvas
      ref={ref}
      className={`rounded-sm ${className}`}
      style={{ imageRendering: "pixelated", width: 8 * scale, height: 8 * scale }}
      title={title ?? seed}
    />
  );
};
