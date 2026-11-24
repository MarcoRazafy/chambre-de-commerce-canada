import Image from "next/image";
import type { CadreLogo } from "@/lib/cadre-logo";

export function LogoRogne({
  src,
  alt,
  cadre,
  hauteur,
  aspectMax,
  priority = false,
  draggable,
}: {
  src: string;
  alt: string;
  cadre: CadreLogo | null;
  hauteur: string;
  aspectMax: number;
  priority?: boolean;
  draggable?: boolean;
}) {
  if (!cadre || cadre.l <= 0 || cadre.h <= 0) {
    return (
      <Image
        src={src}
        alt={alt}
        width={400}
        height={160}
        priority={priority}
        draggable={draggable}
        sizes="480px"
        className="block w-auto object-contain object-left"
        style={{ height: hauteur, maxWidth: `calc(${hauteur} * ${aspectMax})` }}
      />
    );
  }
  const visible = cadre;
  const aspect = (visible.l / visible.h) * visible.ratio;
  const h = aspect > aspectMax ? `calc(${hauteur} * ${(aspectMax / aspect).toFixed(4)})` : hauteur;
  return (
    <span className="relative block overflow-hidden shrink-0" style={{ height: h, aspectRatio: aspect.toFixed(4) }}>
      <Image
        src={src}
        alt={alt}
        width={800}
        height={Math.round(800 / visible.ratio)}
        priority={priority}
        draggable={draggable}
        sizes="480px"
        className="absolute max-w-none"
        style={{
          width: `${(100 / visible.l).toFixed(3)}%`,
          height: `${(100 / visible.h).toFixed(3)}%`,
          left: `${((-visible.x / visible.l) * 100).toFixed(3)}%`,
          top: `${((-visible.y / visible.h) * 100).toFixed(3)}%`,
        }}
      />
    </span>
  );
}
