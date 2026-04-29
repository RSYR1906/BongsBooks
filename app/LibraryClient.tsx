"use client";

import type { Book } from "@/lib/database.types";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type StatusFilter = "all" | "want_to_read" | "reading" | "read";
type Sort = "newest" | "oldest" | "title" | "author";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reading", label: "📖 Reading" },
  { value: "read", label: "✓ Read" },
  { value: "want_to_read", label: "🔖 Want to Read" },
];

const STATUS_BADGE: Record<
  Exclude<StatusFilter, "all">,
  { label: string; cls: string }
> = {
  reading: { label: "📖", cls: "bg-blue-500" },
  read: { label: "✓", cls: "bg-green-500" },
  want_to_read: { label: "🔖", cls: "bg-amber-400" },
};

interface Props {
  books: Book[];
}

export default function LibraryClient({ books }: Props) {
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<Sort>("newest");

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => b.genre?.forEach((g) => set.add(g)));
    return ["All", ...Array.from(set).sort()];
  }, [books]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    let result = books.filter((b) => {
      const matchesQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q);
      const matchesGenre =
        genreFilter === "All" || (b.genre ?? []).includes(genreFilter);
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      return matchesQuery && matchesGenre && matchesStatus;
    });
    switch (sort) {
      case "oldest":
        result = [...result].sort((a, b) =>
          a.added_at.localeCompare(b.added_at),
        );
        break;
      case "title":
        result = [...result].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "author":
        result = [...result].sort((a, b) =>
          (a.author ?? "").localeCompare(b.author ?? ""),
        );
        break;
    }
    return result;
  }, [books, query, genreFilter, statusFilter, sort]);

  if (books.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📖</div>
        <p className="text-lg font-serif font-semibold text-[#1C1C1E]">
          Your library is empty
        </p>
        <p className="text-sm text-[#636366] mt-1">
          Tap <strong>+</strong> below to add your first book
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search — iOS inset style */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#AEAEB2] pointer-events-none text-sm select-none">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search by title or author…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white rounded-xl pl-9 pr-8 py-2.5 text-sm text-[#1C1C1E] focus:outline-none placeholder:text-[#AEAEB2]"
          style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)" }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEAEB2] hover:text-[#636366] text-base"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status filter — iOS segmented control */}
      <div className="bg-[#E5E5EA] rounded-xl p-1 flex">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-[9px] transition-all active:scale-[0.97] leading-snug ${
              statusFilter === s.value
                ? "bg-white text-[#1C1C1E] font-semibold"
                : "text-[#636366]"
            }`}
            style={statusFilter === s.value ? { boxShadow: "0 1px 4px rgba(0,0,0,0.12)" } : {}}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Genre chips */}
      {allGenres.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          {allGenres.map((g) => (
            <button
              key={g}
              onClick={() => setGenreFilter(g)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 ${
                genreFilter === g
                  ? "bg-[#C5872B] text-white"
                  : "bg-white text-[#636366] border border-[#E5E5EA] hover:border-[#C5872B]/30"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Count + sort */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#636366]">
          {filtered.length} {filtered.length === 1 ? "book" : "books"}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="text-xs text-[#636366] bg-transparent focus:outline-none cursor-pointer hover:text-[#1C1C1E] transition-colors"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">A–Z title</option>
          <option value="author">A–Z author</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-[#636366] py-10 text-sm">
          No books match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookCard({ book }: { book: Book }) {
  const statusInfo = book.status
    ? STATUS_BADGE[book.status as Exclude<StatusFilter, "all">]
    : null;

  return (
    <Link href={`/book/${book.id}`} className="group block">
      <div className="aspect-[2/3] relative rounded-xl overflow-hidden group-hover:-translate-y-1.5 transition-all duration-200" style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)" }}>
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            fill
            sizes="(max-width: 640px) 33vw, 25vw"
            className="object-cover"
            unoptimized={book.cover_url.includes("books.google.com")}
          />
        ) : (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center overflow-hidden"
            style={{
              background:
                "linear-gradient(160deg, #7B3500 0%, #4A2000 40%, #2B1200 100%)",
              borderLeft: "3px solid rgba(197,135,43,0.45)",
            }}
          >
            <span className="text-2xl">📕</span>
            <span className="text-[10px] text-amber-200/90 mt-1 line-clamp-3 font-serif leading-tight">
              {book.title}
            </span>
            {book.author && (
              <span className="text-[9px] text-amber-300/50 mt-0.5 line-clamp-1">
                {book.author}
              </span>
            )}
          </div>
        )}
        {statusInfo && (
          <div
            className={`absolute top-1.5 left-1.5 ${statusInfo.cls} text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow z-10`}
          >
            {statusInfo.label}
          </div>
        )}
        {book.read_url && (
          <div className="absolute top-1.5 right-1.5 bg-[#636366] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow z-10 uppercase tracking-wide">
            Free
          </div>
        )}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-[#1C1C1E] line-clamp-2 leading-tight font-serif">
        {book.title}
      </p>
      {book.author && (
        <p className="text-[11px] text-[#636366] line-clamp-1">
          {book.author}
        </p>
      )}
    </Link>
  );
}
