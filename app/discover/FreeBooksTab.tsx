"use client";

import SkeletonCard from "@/app/components/SkeletonCard";
import { useCallback, useEffect, useRef, useState } from "react";
import DiscoverBookCard, { type AddState } from "./DiscoverBookCard";

type Source = "gutenberg" | "archive";

const SOURCES: { id: Source; label: string; hint: string }[] = [
  {
    id: "gutenberg",
    label: "📜 Gutenberg",
    hint: "70 000+ public domain classics",
  },
  {
    id: "archive",
    label: "🏛 Archive.org",
    hint: "Millions of freely readable texts",
  },
];

const ARCHIVE_CATEGORIES: { id: string; label: string }[] = [
  { id: "fiction", label: "Fiction" },
  { id: "science fiction", label: "Sci-Fi" },
  { id: "mystery", label: "Mystery" },
  { id: "romance", label: "Romance" },
  { id: "history", label: "History" },
  { id: "biography", label: "Biography" },
  { id: "adventure", label: "Adventure" },
  { id: "science", label: "Science" },
  { id: "philosophy", label: "Philosophy" },
  { id: "poetry", label: "Poetry" },
  { id: "horror", label: "Horror" },
  { id: "children", label: "Children" },
  { id: "art", label: "Art" },
  { id: "travel", label: "Travel" },
  { id: "nature", label: "Nature" },
  { id: "religion", label: "Religion" },
  { id: "drama", label: "Drama" },
  { id: "technology", label: "Technology" },
];

interface FreeBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  read_url: string | null;
  subjects: string[];
  source: Source;
}

type FreeBookItem = FreeBook & { addState: AddState };

export default function FreeBooksTab() {
  const [source, setSource] = useState<Source>("gutenberg");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [items, setItems] = useState<FreeBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadBooks = useCallback(
    async (
      q: string,
      src: Source,
      cat: string | null,
      page = 1,
      append = false,
    ) => {
      if (page === 1 && !append) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams({ page: String(page), source: src });
        if (q.trim()) params.set("q", q.trim());
        if (cat) params.set("category", cat);
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
    },
    [],
  );

  // Reload when source changes — reset query and category
  useEffect(() => {
    setQuery("");
    setCategory(null);
    loadBooks("", source, null, 1, false);
  }, [source, loadBooks]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (val.trim()) setCategory(null); // typing clears category filter
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => loadBooks(val, source, null, 1, false),
      500,
    );
  }

  function handleCategoryClick(catId: string) {
    const next = category === catId ? null : catId;
    setCategory(next);
    setQuery("");
    loadBooks("", source, next, 1, false);
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

  const activeSource = SOURCES.find((s) => s.id === source)!;
  const showCategories = source === "archive" && !query.trim();

  return (
    <div className="space-y-4">
      {/* Source toggle */}
      <div className="flex bg-[#FFFDF7] rounded-xl border border-[#EDE5D0] overflow-hidden shadow-sm">
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSource(s.id)}
            className={`flex-1 py-2 text-xs font-medium transition-colors ${
              source === s.id
                ? "bg-gold text-white font-semibold"
                : "text-walnut-mid hover:bg-[#F5EDDA] hover:text-walnut"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-walnut-mid/60 pointer-events-none text-sm">
          🔍
        </span>
        <input
          key={source}
          type="search"
          placeholder={`Search ${activeSource.hint}…`}
          value={query}
          onChange={handleQueryChange}
          className="w-full bg-[#FDFAF4] border border-[#C5872B]/25 rounded-xl pl-9 pr-4 py-2.5 text-sm text-walnut focus:outline-none focus:ring-2 focus:ring-gold/30 placeholder:text-walnut-mid/50"
        />
      </div>

      {/* Category filter chips — Archive.org only */}
      {showCategories && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {ARCHIVE_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.id)}
              className={`shrink-0 text-[11px] font-medium px-3 py-1.5 rounded-full border transition-colors ${
                category === cat.id
                  ? "bg-gold text-white border-gold"
                  : "bg-[#F5EDDA] text-walnut-mid border-[#EDE5D0] hover:border-gold/40 hover:text-walnut"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-walnut-mid py-12 text-sm">
          No results found. Try a different search or category.
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
              onClick={() => loadBooks(query, source, category, nextPage, true)}
              disabled={loadingMore}
              className="w-full py-2.5 bg-card border border-parchment-dark rounded-xl text-sm font-medium text-walnut-mid hover:text-walnut hover:border-gold/30 transition-colors disabled:opacity-50 active:scale-[0.99]"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
