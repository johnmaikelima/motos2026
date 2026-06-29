import Image from "next/image";
import type { Gift } from "@/lib/promotions";

export default function GiftCard({ gift }: { gift: Gift }) {
  return (
    <div className="rm-anim relative my-2 animate-[rm-float_4s_ease-in-out_infinite]">
      {/* brilho pulsante atrás */}
      <div
        aria-hidden
        className="absolute -inset-3 -z-10 rounded-2xl bg-gradient-to-r from-lime/50 via-lime/25 to-lime/50 blur-2xl animate-[rm-glow_3s_ease-in-out_infinite]"
      />

      <div className="relative overflow-hidden rounded-xl border border-lime/60 bg-ink-800/90 p-4 backdrop-blur animate-[rm-glowshadow_3s_ease-in-out_infinite]">
        {/* brilho passando (shine) */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/20 blur-md animate-[rm-shine_5s_ease-in-out_infinite]"
        />

        <div className="relative flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-lime/40 bg-ink-700">
            <Image src={gift.image} alt={gift.name} fill className="object-cover" sizes="64px" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-lime">
              <span className="animate-[rm-glow_2s_ease-in-out_infinite] text-base">🎁</span>
              Brinde exclusivo
            </p>
            <p className="mt-0.5 text-sm text-gray-200">Comprando este produto você leva de brinde:</p>
            <p className="truncate text-sm font-bold text-white">{gift.name}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
