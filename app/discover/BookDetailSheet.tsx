"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { AddState, FreeBook } from "./DiscoverBookCard";

function isGutenbergInApp(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return (
      (u.hostname === "gutenberg.org" || u.hostname === "www.gutenberg.org") &&
      !url.includes(".epub")
    );
  } catch {
    return false;
  }
}

const SOURCE_LABEL: Record<FreeBook["source"], string> = {
  gutenberg: "Project Gutenberg",
  standard: "Standard Ebooks",
  archive: "Internet Archive",
};

export default function BookDetailSheet({
  book,
  onAdd,
  onClose,
}: {
  book: (FreeBook & { addState: AddState }) | null;
  onAdd: () => void;
  onClose: () => void;
}) {
  const [description, setDescription] = useState<string | null>(null);
  const [loadingDesc, setLoadingDesc] = useState(false);

  useEffect(() => {
    if (!book) {
      setDescription(null);
      return;
    }
    // Standard Ebooks provides description directly from OPDS feed
    if (book.description) {
      setDescription(book.description);
      return;
    }
    // For Gutenberg / Archive: fetch lazily from Open Library
    setDescription(null);
    setLoadingDesc(true);
    const params = new URLSearchParams({
      title: book.title,
      author: book.author,
    });
    fetch(`/api/discover/description?${params}`)
      .then((r) => r.json())
      .then((d: { description: string | null }) =>
        setDescription(d.description),
      )
      .catch(() => setDescription(null))
      .finally(() => setLoadingDesc(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  if (!book) return null;

  const inApp = isGutenbergInApp(book.read_url);
  const readHref =
    inApp && book.read_url
      ? `/read?url=${encodeURIComponent(book.read_url)}&title=${encodeURIComponent(book.title)}&author=${encodeURIComponent(book.author)}`
      : (book.read_url ?? "");

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-30 bg-black/40"
        style={{
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 inset-x-0 z-40 bg-white rounded-t-3xl max-h-[88vh] flex flex-col"
        style={{ boxShadow: "0 -4px 40px rgba(0,0,0,0.18)" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-[#C2C2C7] rounded-full" />
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 pb-8">
          {/* Cover + meta */}
          <div className="flex gap-4 py-4">
            <div className="w-24 aspect-[2/3] relative rounded-xl overflow-hidden shadow-lg shrink-0">
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={book.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-b from-[#3A1800] to-[#1C0800] flex items-center justify-center text-3xl">
                  📕
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pt-1">
              <h2 className="font-serif font-bold text-[#3D3D45] text-lg leading-tight">
                {book.title}
              </h2>
              {book.author && (
                <p className="text-[#8D8D93] text-sm mt-1">{book.author}</p>
              )}
              {book.subjects.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {book.subjects.slice(0, 4).map((s) => (
                    <span
                      key={s}
                      className="text-[10px] bg-[#F5F5FA] text-[#8D8D93] px-2 py-0.5 rounded-full"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-[#C2C2C7] mt-2">
                {SOURCE_LABEL[book.source]}
              </p>
            </div>
          </div>

          {/* Description */}
          {(loadingDesc || description) && (
            <div className="mb-5">
              <h3 className="text-xs font-semibold text-[#8D8D93] uppercase tracking-wide mb-1.5">
                About
              </h3>
              {loadingDesc ? (
                <div className="space-y-2 animate-pulse">
                  {["w-full", "w-11/12", "w-4/5", "w-3/5"].map((w, i) => (
                    <div key={i} className={`h-3 bg-[#EBEBF0] rounded ${w}`} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#3D3D45] leading-relaxed">
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2.5">
            {book.read_url &&
              (inApp ? (
                <a
                  href={readHref}
                  className="flex items-center justify-center gap-2 w-full bg-[#E8A830] hover:bg-[#F5C068] text-white font-semibold py-3 rounded-2xl transition-all"
                  style={{ boxShadow: "0 4px 16px rgba(232,168,48,0.22)" }}
                >
                  📖 Read in App
                </a>
              ) : (
                <a
                  href={readHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#E8A830] hover:bg-[#F5C068] text-white font-semibold py-3 rounded-2xl transition-all"
                  style={{ boxShadow: "0 4px 16px rgba(232,168,48,0.22)" }}
                >
                  📖 Read Online — Free
                </a>
              ))}
            <button
              onClick={onAdd}
              disabled={book.addState === "saving" || book.addState === "saved"}
              className={`w-full font-semibold py-3 rounded-2xl transition-all active:scale-[0.98] ${
                book.addState === "saved"
                  ? "bg-green-100 text-green-700"
                  : book.addState === "error"
                    ? "bg-red-50 text-red-600 border border-red-200"
                    : book.addState === "saving"
                      ? "bg-[#F5F5FA] text-[#8D8D93] cursor-not-allowed"
                      : "bg-white border border-[#EBEBF0] text-[#3D3D45] hover:bg-[#F5F5FA]"
              }`}
            >
              {book.addState === "saved"
                ? "✓ Added to Library"
                : book.addState === "saving"
                  ? "Adding…"
                  : book.addState === "error"
                    ? "Retry"
                    : "+ Add to Library"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
