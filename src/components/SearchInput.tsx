"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";

export default function SearchInput({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim().length >= 2) router.push(`/busca?q=${encodeURIComponent(q.trim())}`);
      }}
      className="flex overflow-hidden rounded-md border border-white/10 bg-ink-800"
    >
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar produtos..."
        autoFocus
        className="w-full bg-transparent px-4 py-3 text-sm text-white outline-none placeholder:text-gray-500"
      />
      <button type="submit" aria-label="Buscar" className="flex items-center justify-center bg-lime px-5 text-black transition hover:bg-lime-400">
        <SearchIcon width={18} height={18} />
      </button>
    </form>
  );
}
