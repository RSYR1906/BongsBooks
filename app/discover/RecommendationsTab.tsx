"use client";

import SkeletonCard from "@/app/components/SkeletonCard";
import type { GoogleBookVolume } from "@/lib/books";
import { volumeToFormData } from "@/lib/books";
import { useCallback, useEffect, useState } from "react";
import DiscoverBookCard, { type AddState } from "./DiscoverBookCard";

interface RecItem {
  volume: GoogleBookVolume;
  addState: AddState;
  readUrl: string | null; // null = not found / still loading
}

export default function RecommendationsTab() {
  const [items, setItems] = useState<RecItem[]>([]);
  const [basis, setBasis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadRecs = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/recommendations");
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      const volumes = data.results as GoogleBookVolume[];
      const mapped = volumes.map((v) => ({
        volume: v,
        addState: "idle" as AddState,
        readUrl: null,
      }));
      setItems(mapped);
      setBasis(data.basis ?? null);

      // Background: resolve free read URLs — limit to first 6 to avoid
      // overwhelming the browser connection pool with concurrent requests
      volumes.slice(0, 6).forEach((volume, index) => {
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
                prev.map((it, i) =>
                  i === index ? { ...it, readUrl: d.url } : it,
                ),
              );
            }
          })
          .catch(() => {});
      });
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecs();
  }, [loadRecs]);

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

      // Use already-resolved URL or try to find one
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
