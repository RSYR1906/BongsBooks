"use client";

import SkeletonCard from "@/app/components/SkeletonCard";
import type { GoogleBookVolume } from "@/lib/books";
import { volumeToFormData } from "@/lib/books";
import { useCallback, useEffect, useRef, useState } from "react";
import DiscoverBookCard, { type AddState } from "./DiscoverBookCard";

interface OwnedBook {
  id: string;
  title: string;
  isbn: string | null;
  google_books_id: string | null;
}

interface RecItem {
  volume: GoogleBookVolume;
  addState: AddState;
  readUrl: string | null;
}

export default function RecommendationsTab() {
  const [items, setItems] = useState<RecItem[]>([]);
  const [basis, setBasis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(false);
  const [ownedBooks, setOwnedBooks] = useState<OwnedBook[]>([]);
  const offsetRef = useRef(0);
  const seenIds = useRef(new Set<string>());
  const sentinelRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Fetch owned books once
  useEffect(() => {
    fetch("/api/books/owned")
      .then((r) => r.json())
      .then((d: { books?: OwnedBook[] }) => setOwnedBooks(d.books ?? []))
      .catch(() => {});
  }, []);

  function isVolumeOwned(volume: GoogleBookVolume): boolean {
    const isbns = (volume.volumeInfo.industryIdentifiers ?? []).map(
      (i) => i.identifier,
    );
    return ownedBooks.some(
      (o) =>
        (o.google_books_id && o.google_books_id === volume.id) ||
        (o.isbn && isbns.includes(o.isbn)),
    );
  }

  function resolveReadUrls(volumes: GoogleBookVolume[], startIndex: number) {
    volumes.slice(0, 6).forEach((volume, i) => {
      const info = volume.volumeInfo;
      const isbn =
        info.industryIdentifiers?.find(
          (id) => id.type === "ISBN_13" || id.type === "ISBN_10",
        )?.identifier ?? "";
      const params = new URLSearchParams({
        isbn,
        title: info.title,
        author: info.authors?.[0] ?? "",
      });
      fetch(`/api/books/find-read-url?${params}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.url) {
            setItems((prev) =>
              prev.map((it, idx) =>
                idx === startIndex + i ? { ...it, readUrl: d.url } : it,
              ),
            );
          }
        })
        .catch(() => {});
    });
  }

  const fetchPage = useCallback(async (offset: number, isInitial: boolean) => {
    if (isInitial) setLoading(true);
    else setLoadingMore(true);

    try {
      const res = await fetch(`/api/recommendations?offset=${offset}`);
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const volumes = (data.results ?? []) as GoogleBookVolume[];

      if (volumes.length === 0) {
        setHasMore(false);
        return;
      }

      // Deduplicate across pages
      const fresh = volumes.filter((v) => !seenIds.current.has(v.id));
      fresh.forEach((v) => seenIds.current.add(v.id));

      if (fresh.length === 0) {
        setHasMore(false);
        return;
      }

      const newItems: RecItem[] = fresh.map((v) => ({
        volume: v,
        addState: "idle",
        readUrl: null,
      }));

      if (isInitial) {
        setBasis(data.basis ?? null);
        setItems(newItems);
        resolveReadUrls(fresh, 0);
      } else {
        setItems((prev) => {
          resolveReadUrls(fresh, prev.length);
          return [...prev, ...newItems];
        });
      }

      offsetRef.current = offset + 20;
    } catch {
      if (isInitial) setError(true);
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, []);

  // Initial load
  const loadRecs = useCallback(() => {
    seenIds.current.clear();
    offsetRef.current = 0;
    setHasMore(true);
    setError(false);
    fetchPage(0, true);
  }, [fetchPage]);

  useEffect(() => {
    loadRecs();
  }, [loadRecs]);

  // Infinite scroll — watch sentinel
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          fetchPage(offsetRef.current, false);
        }
      },
      { rootMargin: "200px" },
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [fetchPage, loadingMore, hasMore]);

  async function handleAdd(index: number) {
    const item = items[index];
    if (!item || item.addState !== "idle") return;

    setItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, addState: "saving" as AddState } : it,
      ),
    );

    try {
      const form = volumeToFormData(item.volume);

      if (item.readUrl) {
        form.read_url = item.readUrl;
      } else {
        try {
          const params = new URLSearchParams({
            isbn: form.isbn ?? "",
            title: form.title,
            author: form.author ?? "",
          });
          const urlRes = await fetch(`/api/books/find-read-url?${params}`);
          if (urlRes.ok) {
            const urlData = await urlRes.json();
            if (urlData.url) form.read_url = urlData.url;
          }
        } catch {
          // non-critical
        }
      }

      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-40 skeleton rounded-full" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-walnut-mid mb-3 text-sm">
          Could not load recommendations.
        </p>
        <button
          onClick={loadRecs}
          className="bg-gold text-white text-sm font-medium px-5 py-2 rounded-xl active:scale-95 transition-transform"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {basis && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gold bg-gold/10 border border-gold/20 px-3 py-1 rounded-full">
            Based on: {basis}
          </span>
          <button
            onClick={loadRecs}
            className="ml-auto text-xs text-walnut-mid hover:text-walnut transition-colors"
          >
            ↻ Refresh
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-center text-walnut-mid py-12 text-sm">
          Add some books to your library to get personalised recommendations!
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {items.map((item, index) => {
              const info = item.volume.volumeInfo;
              const cover =
                info.imageLinks?.thumbnail?.replace(/^http:/, "https:") ?? null;
              return (
                <DiscoverBookCard
                  key={item.volume.id}
                  title={info.title}
                  author={info.authors?.join(", ")}
                  cover_url={cover}
                  read_url={item.readUrl}
                  addState={item.addState}
                  onAdd={() => handleAdd(index)}
                  inLibrary={isVolumeOwned(item.volume)}
                />
              );
            })}
          </div>

          {/* Sentinel — triggers next page load when scrolled into view */}
          <div ref={sentinelRef} className="h-1" />

          {loadingMore && (
            <div className="grid grid-cols-3 gap-3 pt-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
