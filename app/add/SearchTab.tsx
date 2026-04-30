"use client";

import type { BookFormData, GoogleBookVolume } from "@/lib/books";
import { volumeToFormData } from "@/lib/books";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

interface OwnedBook {
  id: string;
  title: string;
  isbn: string | null;
  google_books_id: string | null;
}

export default function SearchTab() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GoogleBookVolume[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BookFormData | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const [ownedBooks, setOwnedBooks] = useState<OwnedBook[]>([]);
  const [hideOwned, setHideOwned] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch owned books for duplicate detection
  useEffect(() => {
    fetch("/api/books/owned")
      .then((r) => r.json())
      .then((d: { books?: OwnedBook[] }) => setOwnedBooks(d.books ?? []))
      .catch(() => {});
  }, []);

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
            : ((body.error as string) ?? `Search failed (${res.status})`);
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

  function isOwned(vol: GoogleBookVolume): string | null {
    const isbns = (vol.volumeInfo.industryIdentifiers ?? []).map(
      (i) => i.identifier,
    );
    for (const owned of ownedBooks) {
      if (owned.google_books_id && owned.google_books_id === vol.id)
        return owned.id;
      if (owned.isbn && isbns.includes(owned.isbn)) return owned.id;
    }
    return null;
  }

  const displayResults = hideOwned
    ? results.filter((v) => !isOwned(v))
    : results;

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
      if (res.status === 409 && data.duplicate) {
        setDuplicateId(data.existingId as string);
        return;
      }
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

  // ── Success state ──────────────────────────────────────────────────────────
  if (savedId) {
    return (
      <div
        className="bg-white rounded-2xl p-6 text-center space-y-4"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="text-4xl">✅</div>
        <p className="font-semibold text-[#3D3D45]">
          Book added to your library!
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setSavedId(null);
              setQuery("");
            }}
            className="bg-[#E8A830] text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            Add Another
          </button>
          <button
            onClick={() => router.push(`/book/${savedId}`)}
            className="border border-[#EBEBF0] text-[#8D8D93] text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#F5F5FA] transition-colors"
          >
            View Book
          </button>
        </div>
      </div>
    );
  }

  // ── Duplicate state ────────────────────────────────────────────────────────
  if (duplicateId) {
    return (
      <div
        className="bg-white rounded-2xl p-6 text-center space-y-4"
        style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="text-4xl">📚</div>
        <p className="font-semibold text-[#3D3D45]">Already in your library!</p>
        <p className="text-sm text-[#8D8D93]">
          This book is already saved. Would you like to view it?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setDuplicateId(null);
              setSelected(null);
            }}
            className="border border-[#EBEBF0] text-[#8D8D93] text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-[#F5F5FA] transition-colors"
          >
            Keep Searching
          </button>
          <button
            onClick={() => router.push(`/book/${duplicateId}`)}
            className="bg-[#E8A830] text-white text-sm font-medium px-4 py-2.5 rounded-xl active:scale-95 transition-transform"
          >
            View Book →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <input
        type="search"
        placeholder="Search by title, author, or ISBN…"
        value={query}
        onChange={handleQueryChange}
        className="w-full bg-white rounded-xl px-4 py-2.5 text-sm text-[#3D3D45] focus:outline-none placeholder:text-[#C2C2C7]"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
        }}
        autoFocus
      />

      {searching && (
        <p className="text-sm text-[#8D8D93] text-center animate-pulse">
          Searching…
        </p>
      )}

      {searchError && !searching && (
        <div className="bg-red-50 rounded-xl px-4 py-3 text-sm text-red-500 text-center">
          {searchError}
        </div>
      )}

      {!searching && !searchError && query.trim() && results.length === 0 && (
        <p className="text-sm text-[#8D8D93] text-center py-4">
          No books found for &ldquo;{query}&rdquo;. Try a different title or
          author.
        </p>
      )}

      {results.length > 0 && !selected && (
        <>
          {/* Hide owned toggle */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#8D8D93]">
              {displayResults.length} result
              {displayResults.length !== 1 ? "s" : ""}
              {hideOwned && results.length - displayResults.length > 0
                ? ` (${results.length - displayResults.length} owned hidden)`
                : ""}
            </p>
            <button
              onClick={() => setHideOwned((v) => !v)}
              className={`text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${
                hideOwned
                  ? "bg-[#E8A830] text-white"
                  : "bg-[#F5F5FA] text-[#8D8D93] border border-[#EBEBF0]"
              }`}
            >
              Hide owned
            </button>
          </div>

          <div
            className="bg-white rounded-xl overflow-hidden"
            style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
          >
            {displayResults.map((vol) => {
              const info = vol.volumeInfo;
              const thumb = info.imageLinks?.smallThumbnail?.replace(
                /^http:/,
                "https:",
              );
              const ownedId = isOwned(vol);
              return (
                <button
                  key={vol.id}
                  onClick={() => handleSelect(vol)}
                  className="w-full flex items-center gap-3 px-4 py-3 border-b border-black/[0.05] last:border-0 hover:bg-[#F5F5FA] transition-colors text-left"
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
                    <div className="w-9 h-14 bg-[#EBEBF0] rounded flex items-center justify-center shrink-0 text-xl">
                      📕
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#3D3D45] line-clamp-2 font-serif">
                      {info.title}
                    </p>
                    {info.authors && (
                      <p className="text-xs text-[#8D8D93]">
                        {info.authors.join(", ")}
                      </p>
                    )}
                    {info.publishedDate && (
                      <p className="text-xs text-[#C2C2C7]">
                        {info.publishedDate}
                      </p>
                    )}
                  </div>
                  {ownedId && (
                    <span className="shrink-0 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-md">
                      ✓ Owned
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {selected && (
        <div
          className="bg-white rounded-2xl p-5 space-y-4"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        >
          <div className="flex gap-4">
            {selected.cover_url && (
              <Image
                src={selected.cover_url}
                alt={selected.title}
                width={60}
                height={90}
                className="rounded-lg shadow object-cover shrink-0"
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
            <p className="text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
              ✅ Free online copy found!
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setSelected(null)}
              className="flex-1 border border-[#EBEBF0] text-[#8D8D93] text-sm font-medium py-2.5 rounded-xl hover:bg-[#F5F5FA] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !selected.title.trim()}
              className="flex-1 bg-[#E8A830] hover:bg-[#F5C068] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
            >
              {saving ? "Saving…" : "Save to Library"}
            </button>
          </div>
        </div>
      )}

      {!selected && !searching && query && results.length === 0 && (
        <div
          className="bg-white rounded-2xl p-5 space-y-3"
          style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
        >
          <p className="text-sm text-[#8D8D93]">
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
      <label className="block text-xs font-medium text-[#8D8D93] mb-0.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#F5F5FA] rounded-lg px-2.5 py-1.5 text-sm text-[#3D3D45] focus:outline-none placeholder:text-[#C2C2C7]"
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
        <label className="block text-xs font-medium text-[#8D8D93] mb-0.5">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-[#F5F5FA] rounded-lg px-2.5 py-1.5 text-sm text-[#3D3D45] focus:outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-[#8D8D93] mb-0.5">
          Author
        </label>
        <input
          type="text"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="w-full bg-[#F5F5FA] rounded-lg px-2.5 py-1.5 text-sm text-[#3D3D45] focus:outline-none"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving || !title.trim()}
        className="w-full bg-[#E8A830] hover:bg-[#F5C068] disabled:opacity-50 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
      >
        {saving ? "Saving…" : "Save to Library"}
      </button>
    </div>
  );
}

