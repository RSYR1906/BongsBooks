"use client";

import type { Book } from "@/lib/database.types";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

interface Props {
  books: Book[];
}

export default function LibraryClient({ books }: Props) {
  const [query, setQuery] = useState("");
  const [genreFilter, setGenreFilter] = useState("All");

  const allGenres = useMemo(() => {
    const set = new Set<string>();
    books.forEach((b) => b.genre?.forEach((g) => set.add(g)));
    return ["All", ...Array.from(set).sort()];
  }, [books]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return books.filter((b) => {
      const matchesQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.author ?? "").toLowerCase().includes(q);
      const matchesGenre =
        genreFilter === "All" || (b.genre ?? []).includes(genreFilter);
      return matchesQuery && matchesGenre;
    });
  }, [books, query, genreFilter]);

  if (books.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">📖</div>
        <p className="text-lg font-serif font-semibold text-walnut">
          Your library is empty
        </p>
        <p className="text-sm text-walnut-mid mt-1">
          Tap <strong>+</strong> below to add your first book
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search with icon + clear */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-walnut-mid/50 pointer-events-none text-sm">
          🔍
        </span>
        <input
          type="search"
          placeholder="Search by title or author…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full border border-parchment-dark bg-card rounded-xl pl-9 pr-8 py-2.5 text-sm text-walnut focus:outline-none focus:ring-2 focus:ring-gold/30 placeholder:text-walnut-mid/40"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-walnut-mid/60 hover:text-walnut text-base"
          >
            ✕
          </button>
        )}
      </div>

      {/* Genre chips */}
      {allGenres.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {allGenres.map((g) => (
            <button
              key={g}
              onClick={() => setGenreFilter(g)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition-all active:scale-95 ${
                genreFilter === g
                  ? "bg-walnut text-white shadow-sm"
                  : "bg-card text-walnut-mid border border-parchment-dark hover:border-gold/40"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {/* Count */}
      <p className="text-xs text-walnut-mid">
        {filtered.length} {filtered.length === 1 ? "book" : "books"}
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-walnut-mid py-10 text-sm">
          No books match your search.
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
  return (
    <Link href={`/book/${book.id}`} className="group block">
      <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-md group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-200">
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
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-walnut-mid to-walnut">
            <span className="text-3xl">📕</span>
            <span className="text-xs text-amber-200 mt-1 line-clamp-3 font-serif leading-tight">
              {book.title}
            </span>
          </div>
        )}
        {book.read_url && (
          <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow z-10 uppercase tracking-wide">
            Free
          </div>
        )}
      </div>
      <p className="mt-1.5 text-xs font-semibold text-walnut line-clamp-2 leading-tight font-serif">
        {book.title}
      </p>
      {book.author && (
        <p className="text-[11px] text-walnut-mid line-clamp-1">
          {book.author}
        </p>
      )}
    </Link>
  );
}
