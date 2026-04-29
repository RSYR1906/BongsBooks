"use client";

import SkeletonCard from "@/app/components/SkeletonCard";
import { useCallback, useEffect, useRef, useState } from "react";
import DiscoverBookCard, { type AddState } from "./DiscoverBookCard";

interface FreeBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  read_url: string | null;
  subjects: string[];
}

type FreeBookItem = FreeBook & { addState: AddState };

export default function FreeBooksTab() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FreeBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBooks = useCallback(async (q: string, page = 1, append = false) => {
    if (page === 1 && !append) setLoading(true);
    else setLoadingMore(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        source: "gutenberg",
      });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/discover/free?${params}`);
      const data = await res.json();
      const newItems: FreeBookItem[] = (data.results ?? []).map(
        (b: FreeBook) => ({ ...b, addState: "idle" as AddState }),
      );
      setItems((prev) => (append ? [...prev, ...newItems] : newItems));
      setNextPage(data.nextPage ?? null);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    loadBooks("", 1, false);
  }, [loadBooks]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadBooks(val, 1, false), 500);
  }

  async function handleAdd(index: number) {
    const item = items[index];
    if (!item || item.addState !== "idle") return;

    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, addState: "saving" as AddState } : it,
      ),
    );

    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: item.title,
          author: item.author || null,
          cover_url: item.cover_url || null,
          read_url: item.read_url || null,
          genre: item.subjects.length > 0 ? item.subjects : null,
        }),
      });

      setItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? { ...it, addState: (res.ok ? "saved" : "error") as AddState }
            : it,
        ),
      );
    } catch {
      setItems((prev) =>
        prev.map((it, i) =>
          i === index ? { ...it, addState: "error" as AddState } : it,
        ),
      );
    }
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEB2] pointer-events-none text-sm select-none">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search 70 000+ public domain classics…"
          value={query}
          onChange={handleQueryChange}
          className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#1C1C1E] focus:outline-none placeholder:text-[#AEAEB2]"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-[#636366] py-12 text-sm">
          No results found. Try a different search.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {items.map((item, index) => (
              <DiscoverBookCard
                key={`${item.id}-${index}`}
                title={item.title}
                author={item.author}
                cover_url={item.cover_url}
                read_url={item.read_url}
                addState={item.addState}
                onAdd={() => handleAdd(index)}
              />
            ))}
          </div>
          {nextPage && (
            <button
              onClick={() => loadBooks(query, nextPage, true)}
              disabled={loadingMore}
              className="w-full py-2.5 bg-white border border-[#E5E5EA] rounded-xl text-sm font-medium text-[#636366] hover:text-[#1C1C1E] hover:border-[#AEAEB2] transition-colors disabled:opacity-50 active:scale-[0.99]"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
