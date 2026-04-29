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
        <p className="text-lg font-serif font-semibold text-[#3D3D45]">
          Your library is empty
        </p>
        <p className="text-sm text-[#8D8D93] mt-1">
          Tap <strong>+</strong> below to add your first book
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search — iOS inset style */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#C2C2C7] pointer-events-none text-sm select-none">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search by title or author…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full bg-white rounded-xl pl-9 pr-8 py-2.5 text-sm text-[#3D3D45] focus:outline-none placeholder:text-[#C2C2C7]"
          style={{
            boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
          }}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C2C2C7] hover:text-[#8D8D93] text-base"
          >
            ✕
          </button>
        )}
      </div>

      {/* Status filter — iOS segmented control */}
      <div className="bg-[#EBEBF0] rounded-xl p-1 flex">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`flex-1 py-1.5 text-[11px] font-medium rounded-[9px] transition-all active:scale-[0.97] leading-snug ${
              statusFilter === s.value
                ? "bg-white text-[#3D3D45] font-semibold"
                : "text-[#8D8D93]"
            }`}
            style={
              statusFilter === s.value
                ? { boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }
                : {}
            }
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
                  ? "bg-[#E8A830] text-white"
                  : "bg-white text-[#8D8D93] border border-[#EBEBF0] hover:border-[#E8A830]/30"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Count + sort */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#8D8D93]">
          {filtered.length} {filtered.length === 1 ? "book" : "books"}
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="text-xs text-[#8D8D93] bg-transparent focus:outline-none cursor-pointer hover:text-[#3D3D45] transition-colors"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">A–Z title</option>
          <option value="author">A–Z author</option>
        </select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-[#8D8D93] py-10 text-sm">
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
      <div
        className="aspect-[2/3] relative rounded-xl overflow-hidden group-hover:-translate-y-1.5 transition-all duration-200"
        style={{
          boxShadow: "0 2px 8px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
        }}
      >
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
              borderLeft: "3px solid rgba(232,168,48,0.35)",
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
          <div className="absolute top-1.5 right-1.5 bg-[#8D8D93] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md shadow z-10 uppercase tracking-wide">
            Free
          </div>
        )}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-[#3D3D45] line-clamp-2 leading-tight font-serif">
        {book.title}
      </p>
      {book.author && (
        <p className="text-[11px] text-[#8D8D93] line-clamp-1">{book.author}</p>
      )}
    </Link>
  );
}
