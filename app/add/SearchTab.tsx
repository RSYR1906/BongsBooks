"use client";

import type { BookFormData, GoogleBookVolume } from "@/lib/books";
import { volumeToFormData } from "@/lib/books";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookVolume[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick up ISBN from barcode scan
  useEffect(() => {
    const isbn = sessionStorage.getItem("scan_isbn");
    if (isbn) {
      sessionStorage.removeItem("scan_isbn");
      setQuery(isbn);
      doSearch(isbn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearchError(null);
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const res = await fetch(`/api/books/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg =
          res.status === 504
            ? "Search timed out — try again."
            : (body.error as string) ?? `Search failed (${res.status})`;
        throw new Error(msg);
      }
      const data = await res.json();
      const items: GoogleBookVolume[] = data.items ?? [];
      setResults(items);
    } catch (err) {
      setResults([]);
      setSearchError(
        err instanceof Error ? err.message : "Search failed — try again.",
      );
    } finally {
      setSearching(false);
    }
  }, []);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 500);
  }

  async function handleSelect(volume: GoogleBookVolume) {
    const form = volumeToFormData(volume);
    setSelected(form);
    setResults([]);

    // Find read URL in background
    if (form.isbn || form.title) {
      try {
        const params = new URLSearchParams({
          isbn: form.isbn,
          title: form.title,
          author: form.author,
        });
        const res = await fetch(`/api/books/find-read-url?${params}`);
        const data = await res.json();
        if (data.url) {
          setSelected((prev) =>
            prev ? { ...prev, read_url: data.url } : prev,
          );
        }
      } catch {
        // read url is best-effort
      }
    }
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selected),
      });
      const data = await res.json();
      if (res.ok) {
        setSavedId(data.book.id);
        setSelected(null);
        setQuery("");
      } else {
        alert(`Error: ${data.error}`);
      }
    } finally {
      setSaving(false);
    }
  }

  if (savedId) {
    return (
      <div className="bg-card border border-parchment-dark rounded-2xl p-6 text-center space-y-4 shadow">
        <div className="text-4xl">✅</div>
        <p className="font-semibold text-walnut">Book added to your library!</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSavedId(null);
              setQuery("");
            }}
            className="bg-gold text-white text-sm font-medium px-4 py-2 rounded-xl active:scale-95 transition-transform"
          >
            Add Another
          </button>
          <button
            onClick={() => router.push(`/book/${savedId}`)}
            className="border border-gold text-walnut-mid text-sm font-medium px-4 py-2 rounded-xl"
          >
            View Book
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input
        type="search"
        placeholder="Search by title, author, or ISBN…"
        value={query}
        onChange={handleQueryChange}
        className="w-full border border-parchment-dark bg-card rounded-xl px-4 py-2.5 text-sm text-walnut focus:outline-none focus:ring-2 focus:ring-gold/30 placeholder:text-walnut-mid/40"
        autoFocus
      />

      {searching && (
        <p className="text-sm text-walnut-mid text-center animate-pulse">
          Searching…
        </p>
      )}

      {searchError && !searching && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 text-center">
          {searchError}
        </div>
      )}

      {!searching && !searchError && query.trim() && results.length === 0 && (
        <p className="text-sm text-walnut-mid text-center py-4">
          No books found for &ldquo;{query}&rdquo;. Try a different title or
          author.
        </p>
      )}

      {/* Search results */}
      {results.length > 0 && !selected && (
        <div className="bg-card rounded-xl shadow border border-parchment-dark divide-y divide-parchment-dark">
          {results.map((vol) => {
            const info = vol.volumeInfo;
            const thumb = info.imageLinks?.smallThumbnail?.replace(
              /^http:/,
              "https:",
            );
            return (
              <button
                key={vol.id}
                onClick={() => handleSelect(vol)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-parchment-dark/30 transition-colors text-left"
              >
                {thumb ? (
                  <Image
                    src={thumb}
                    alt={info.title}
                    width={36}
                    height={54}
                    className="rounded shrink-0 object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-9 h-14 bg-parchment-dark rounded flex items-center justify-center shrink-0 text-xl">
                    📕
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-walnut line-clamp-2 font-serif">
                    {info.title}
                  </p>
                  {info.authors && (
                    <p className="text-xs text-gray-500">
                      {info.authors.join(", ")}
                    </p>
                  )}
                  {info.publishedDate && (
                    <p className="text-xs text-gray-400">
                      {info.publishedDate}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Selected book form */}
      {selected && (
        <div className="bg-card border border-parchment-dark rounded-2xl shadow p-5 space-y-4">
          <div className="flex gap-4">
            {selected.cover_url && (
              <Image
                src={selected.cover_url}
                alt={selected.title}
                width={60}
                height={90}
                className="rounded shadow object-cover shrink-0"
                unoptimized
              />
            )}
            <div className="flex-1 min-w-0 space-y-3">
              <Field
                label="Title"
                value={selected.title}
                onChange={(v) => setSelected({ ...selected, title: v })}
              />
              <Field
                label="Author"
                value={selected.author}
                onChange={(v) => setSelected({ ...selected, author: v })}
              />
              <Field
                label="ISBN"
                value={selected.isbn}
                onChange={(v) => setSelected({ ...selected, isbn: v })}
              />
            </div>
          </div>

          {selected.read_url && (
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
              ✅ Free online copy found!
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setSelected(null)}
              className="flex-1 border border-parchment-dark text-walnut-mid text-sm font-medium py-2.5 rounded-xl hover:bg-parchment-dark/30 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selected.title.trim()}
              className="flex-1 bg-gold hover:bg-gold-light disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
            >
              {saving ? "Saving…" : "Save to Library"}
            </button>
          </div>
        </div>
      )}

      {/* Manual entry fallback */}
      {!selected && !searching && query && results.length === 0 && (
        <div className="bg-card border border-parchment-dark rounded-2xl shadow p-5 space-y-3">
          <p className="text-sm text-walnut-mid">
            No results. Enter details manually:
          </p>
          <ManualForm query={query} onSaved={(id) => setSavedId(id)} />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-walnut-mid mb-0.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-parchment-dark bg-parchment rounded-lg px-2.5 py-1.5 text-sm text-walnut focus:outline-none focus:ring-2 focus:ring-gold/30"
      />
    </div>
  );
}

function ManualForm({
  query,
  onSaved,
}: {
  query: string;
  onSaved: (id: string) => void;
}) {
  const [title, setTitle] = useState(query);
  const [author, setAuthor] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/books", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          author: author.trim() || null,
        }),
      });
      const data = await res.json();
      if (res.ok) onSaved(data.book.id);
      else alert(`Error: ${data.error}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-walnut-mid mb-0.5">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border border-parchment-dark bg-parchment rounded-lg px-2.5 py-1.5 text-sm text-walnut focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-walnut-mid mb-0.5">
          Author
        </label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full border border-parchment-dark bg-parchment rounded-lg px-2.5 py-1.5 text-sm text-walnut focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving || !title.trim()}
        className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
      >
        {saving ? "Saving…" : "Save to Library"}
      </button>
    </div>
  );
}
