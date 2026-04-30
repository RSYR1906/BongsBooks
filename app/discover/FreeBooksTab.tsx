"use client";

import SkeletonCard from "@/app/components/SkeletonCard";
import { useCallback, useEffect, useRef, useState } from "react";
import BookDetailSheet from "./BookDetailSheet";
import DiscoverBookCard, {
  type AddState,
  type FreeBook,
} from "./DiscoverBookCard";

type Source = "gutenberg" | "standard";

const SOURCES: { id: Source; label: string }[] = [
  { id: "gutenberg", label: "📚 Gutenberg" },
  { id: "standard", label: "✨ Standard Ebooks" },
];

type FreeBookItem = FreeBook & { addState: AddState };

interface OwnedBook {
  id: string;
  title: string;
  isbn: string | null;
  google_books_id: string | null;
}

export default function FreeBooksTab() {
  const [source, setSource] = useState<Source>("gutenberg");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<FreeBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [ownedBooks, setOwnedBooks] = useState<OwnedBook[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Fetch owned books once
  useEffect(() => {
    fetch("/api/books/owned")
      .then((r) => r.json())
      .then((d: { books?: OwnedBook[] }) => setOwnedBooks(d.books ?? []))
      .catch(() => {});
  }, []);

  function isOwned(item: FreeBook): boolean {
    const titleLower = item.title.toLowerCase();
    return ownedBooks.some(
      (o) =>
        (item.id && o.google_books_id === item.id) ||
        o.title.toLowerCase() === titleLower,
    );
  }

  const loadBooks = useCallback(
    async (q: string, page = 1, append = false, src: Source = "gutenberg") => {
      if (page === 1 && !append) setLoading(true);
      else setLoadingMore(true);
      try {
        const params = new URLSearchParams({ page: String(page), source: src });
        if (q.trim() && src !== "standard") params.set("q", q.trim());
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

  // Reload whenever source changes
  useEffect(() => {
    setQuery("");
    setSelectedIndex(null);
    loadBooks("", 1, false, source);
  }, [source, loadBooks]);

  // Infinite scroll sentinel
  useEffect(() => {
    if (!sentinelRef.current || !nextPage) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !loadingMore) {
          loadBooks(query, nextPage, true, source);
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [nextPage, loadingMore, query, source, loadBooks]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => loadBooks(val, 1, false, source),
      500,
    );
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

  const selectedBook =
    selectedIndex !== null ? (items[selectedIndex] ?? null) : null;

  return (
    <div className="space-y-4">
      {/* Source switcher */}
      <div
        className="flex bg-white rounded-xl p-1 gap-1"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}
      >
        {SOURCES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSource(s.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              source === s.id
                ? "bg-[#E8A830] text-white shadow-sm"
                : "text-[#8D8D93] hover:text-[#3D3D45]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search bar (Gutenberg only) */}
      {source === "gutenberg" ? (
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C2C2C7] pointer-events-none text-sm select-none">
            🔍
          </span>
          <input
            type="search"
            placeholder="Search 70 000+ public domain classics…"
            value={query}
            onChange={handleQueryChange}
            className="w-full bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm text-[#3D3D45] focus:outline-none placeholder:text-[#C2C2C7]"
            style={{
              boxShadow:
                "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
            }}
          />
        </div>
      ) : (
        <p className="text-center text-[11px] text-[#8D8D93]">
          Curated collection of ~900 carefully typeset classics — browse by page
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-[#8D8D93] py-12 text-sm">
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
                onInfo={() => setSelectedIndex(index)}
                inLibrary={isOwned(item)}
              />
            ))}
          </div>
          {loadingMore && (
            <p className="text-center text-xs text-[#8D8D93] animate-pulse py-2">
              Loading more…
            </p>
          )}
          <div ref={sentinelRef} className="h-1" />
        </>
      )}

      {/* Book detail sheet */}
      <BookDetailSheet
        book={selectedBook}
        onAdd={() => selectedIndex !== null && handleAdd(selectedIndex)}
        onClose={() => setSelectedIndex(null)}
      />
    </div>
  );
}
