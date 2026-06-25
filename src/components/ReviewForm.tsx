"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { submitReview, type ReviewState } from "@/server/review-actions";
import { StarIcon } from "./icons";

export default function ReviewForm({ productId, state }: { productId: string; state: ReviewState }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");

  if (!state.loggedIn) {
    return (
      <p className="rounded-md border border-white/10 bg-ink-800 p-4 text-sm text-gray-400">
        <Link href="/conta" className="text-lime hover:underline">Entre na sua conta</Link> para avaliar (só quem comprou pode avaliar).
      </p>
    );
  }
  if (!state.canReview) {
    return (
      <p className="rounded-md border border-white/10 bg-ink-800 p-4 text-sm text-gray-400">
        Só quem comprou este produto pode avaliá-lo.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-white/10 bg-ink-800 p-4">
      <p className="mb-2 text-sm font-semibold text-white">
        {state.alreadyReviewed ? "Editar sua avaliação" : "Deixe sua avaliação"}
      </p>
      <div className="mb-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            aria-label={`${n} estrelas`}
          >
            <StarIcon width={26} height={26} className={n <= (hover || rating) ? "text-lime" : "text-gray-600"} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        placeholder="Conte o que achou do produto (opcional)"
        className="w-full rounded-md border border-white/10 bg-ink-900 px-3 py-2 text-sm text-white outline-none focus:border-lime/60"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() =>
            start(async () => {
              const res = await submitReview(productId, rating, comment);
              setMsg(res.message);
              if (res.ok) router.refresh();
            })
          }
          disabled={pending}
          className="btn-primary disabled:opacity-50"
        >
          {pending ? "Enviando..." : "Enviar avaliação"}
        </button>
        {msg && <span className="text-xs text-gray-300">{msg}</span>}
      </div>
    </div>
  );
}
