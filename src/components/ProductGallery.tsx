"use client";

import { useState } from "react";
import Image from "next/image";

export default function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const list = images.length ? images : ["/placeholder.svg"];
  const [active, setActive] = useState(list[0]);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const srcOf = (u: string) => (failed[u] ? "/placeholder.svg" : u);
  const markFailed = (u: string) => setFailed((f) => ({ ...f, [u]: true }));

  return (
    <div className="flex flex-col gap-3">
      <div className="card relative aspect-square overflow-hidden">
        <Image
          src={srcOf(active)}
          alt={alt}
          fill
          priority
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
          onError={() => markFailed(active)}
        />
      </div>
      {list.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {list.slice(0, 10).map((url) => (
            <button
              key={url}
              onClick={() => setActive(url)}
              className={`relative aspect-square overflow-hidden rounded-md border ${
                active === url ? "border-lime" : "border-white/10 hover:border-white/30"
              }`}
            >
              <Image src={srcOf(url)} alt="" fill className="object-cover" sizes="80px" onError={() => markFailed(url)} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
