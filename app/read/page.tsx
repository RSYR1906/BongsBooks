"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

// ─── Icons ────────────────────────────────────────────────────────────────────
function ChevronLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

// ─── Theme + font config ──────────────────────────────────────────────────────
type Theme = "light" | "sepia" | "dark";

const THEMES: Record<
  Theme,
  {
    bg: string;
    text: string;
    secondary: string;
    border: string;
    header: string;
  }
> = {
  light: {
    bg: "bg-white",
    text: "text-[#3D3D45]",
    secondary: "text-[#8D8D93]",
    border: "border-[#EBEBF0]",
    header: "bg-white/90",
  },
  sepia: {
    bg: "bg-[#FBF6EF]",
    text: "text-[#3B2A1A]",
    secondary: "text-[#8C7355]",
    border: "border-[#E4D9CB]",
    header: "bg-[#FBF6EF]/90",
  },
  dark: {
    bg: "bg-[#1C1C1E]",
    text: "text-[#E5E5EA]",
    secondary: "text-[#8D8D93]",
    border: "border-[#2C2C2E]",
    header: "bg-[#1C1C1E]/90",
  },
};

const FONT_SIZES = ["text-base", "text-lg", "text-xl"] as const;
type FontSize = (typeof FONT_SIZES)[number];

const THEME_ICON: Record<Theme, string> = {
  light: "☀️",
  sepia: "📜",
  dark: "🌙",
};

const THEME_CYCLE: Record<Theme, Theme> = {
  light: "sepia",
  sepia: "dark",
  dark: "light",
};

// ─── Main reader component ────────────────────────────────────────────────────
function ReaderContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url") ?? "";
  const title = searchParams.get("title") ?? "Book";
  const author = searchParams.get("author") ?? "";
  const bookId = searchParams.get("id") ?? "";

  const [paragraphs, setParagraphs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [theme, setTheme] = useState<Theme>("light");
  const [fontIdx, setFontIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const lastScrollY = useRef(0);
  const savedProgressRef = useRef<number | null>(null);
  const saveThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedProgressRef = useRef<number>(-1);

  // Fetch book content via proxy, then restore saved position
  useEffect(() => {
    if (!url) {
      setError("No book URL provided.");
      setLoading(false);
      return;
    }

    // Fetch saved progress if we have a bookId
    const progressFetch = bookId
      ? fetch(`/api/books/owned`)
          .then((r) => r.json())
          .then(
            (d: {
              books?: { id: string; read_progress?: number | null }[];
            }) => {
              const owned = d.books ?? [];
              const match = owned.find((b) => b.id === bookId);
              if (match?.read_progress && match.read_progress > 0) {
                savedProgressRef.current = match.read_progress;
              }
            },
          )
          .catch(() => {})
      : Promise.resolve();

    fetch(`/api/read?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setParagraphs(data.paragraphs as string[]);
      })
      .catch((e: Error) => setError(e.message))
      .finally(async () => {
        await progressFetch;
        setLoading(false);
      });
  }, [url, bookId]);

  // Restore scroll position after content renders
  useEffect(() => {
    if (loading || paragraphs.length === 0) return;
    const saved = savedProgressRef.current;
    if (saved && saved > 1) {
      // Small timeout to let the DOM finish rendering all paragraphs
      const t = setTimeout(() => {
        const total =
          document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: (saved / 100) * total, behavior: "instant" });
      }, 120);
      return () => clearTimeout(t);
    }
  }, [loading, paragraphs]);

  // Save progress to Supabase (throttled — only when crossing 5% thresholds)
  function maybeSaveProgress(pct: number) {
    if (!bookId) return;
    const rounded = Math.floor(pct / 5) * 5;
    if (rounded === lastSavedProgressRef.current) return;
    lastSavedProgressRef.current = rounded;

    if (saveThrottleRef.current) clearTimeout(saveThrottleRef.current);
    saveThrottleRef.current = setTimeout(() => {
      fetch(`/api/books/${bookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read_progress: rounded }),
      }).catch(() => {});
    }, 1500);
  }

  // Scroll progress + hide controls on scroll down
  useEffect(() => {
    function onScroll() {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      setProgress(pct);
      maybeSaveProgress(pct);

      // Hide controls when scrolling down, show when scrolling up
      setShowControls(scrolled < lastScrollY.current || scrolled < 80);
      lastScrollY.current = scrolled;
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const t = THEMES[theme];
  const fontSize: FontSize = FONT_SIZES[fontIdx];
  const backHref = bookId ? `/book/${bookId}` : "/";

  return (
    <div
      className={`min-h-screen transition-colors duration-200 ${t.bg} ${t.text}`}
    >
      {/* Sticky header */}
      <header
        className={`sticky top-0 z-20 ${t.header} border-b ${t.border} transition-all duration-200 ${
          showControls
            ? "translate-y-0 opacity-100"
            : "-translate-y-full opacity-0"
        }`}
        style={{
          backdropFilter: "saturate(180%) blur(20px)",
          WebkitBackdropFilter: "saturate(180%) blur(20px)",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-13 py-3 flex items-center gap-2">
          {/* Back */}
          <Link
            href={backHref}
            className="flex items-center gap-0.5 text-[#E8A830] text-sm font-medium shrink-0 -ml-1"
          >
            <ChevronLeftIcon />
            Back
          </Link>

          {/* Title */}
          <div className="flex-1 min-w-0 text-center px-2">
            <p className="text-xs font-semibold truncate leading-tight">
              {title}
            </p>
            {author && (
              <p className={`text-[10px] truncate ${t.secondary}`}>{author}</p>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => setFontIdx((i) => Math.max(0, i - 1))}
              disabled={fontIdx === 0}
              className={`w-8 h-8 flex items-center justify-center text-[11px] font-bold rounded-lg transition-opacity ${
                fontIdx === 0
                  ? "opacity-25 cursor-not-allowed"
                  : `opacity-60 hover:opacity-100 ${t.text}`
              }`}
              aria-label="Decrease font size"
            >
              A-
            </button>
            <button
              onClick={() =>
                setFontIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))
              }
              disabled={fontIdx === FONT_SIZES.length - 1}
              className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded-lg transition-opacity ${
                fontIdx === FONT_SIZES.length - 1
                  ? "opacity-25 cursor-not-allowed"
                  : `opacity-60 hover:opacity-100 ${t.text}`
              }`}
              aria-label="Increase font size"
            >
              A+
            </button>
            <button
              onClick={() => setTheme((th) => THEME_CYCLE[th])}
              className="w-8 h-8 flex items-center justify-center text-sm rounded-lg opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Toggle theme"
            >
              {THEME_ICON[theme]}
            </button>
          </div>
        </div>

        {/* Reading progress bar */}
        <div className={`h-0.5 ${t.border} border-t-0`}>
          <div
            className="h-full bg-[#E8A830] transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Book content */}
      <main className="max-w-[66ch] mx-auto px-5 py-8 pb-24">
        {loading && (
          <div className="space-y-3 animate-pulse mt-4">
            {Array.from({ length: 14 }).map((_, i) => (
              <div
                key={i}
                className={`h-4 rounded ${
                  theme === "dark" ? "bg-[#2C2C2E]" : "bg-[#EBEBF0]"
                } ${i % 5 === 4 ? "w-1/2" : i % 3 === 2 ? "w-5/6" : "w-full"}`}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">⚠️</p>
            <p className="font-semibold text-lg mb-2">
              Couldn&apos;t load this book
            </p>
            <p className={`text-sm mb-6 ${t.secondary}`}>{error}</p>
            <Link
              href={backHref}
              className="text-[#E8A830] font-medium text-sm hover:underline"
            >
              ← Go back
            </Link>
          </div>
        )}

        {!loading && !error && paragraphs.length === 0 && (
          <div className="text-center py-24">
            <p className="text-4xl mb-4">📄</p>
            <p className={`text-sm ${t.secondary}`}>
              No readable content found in this file.
            </p>
          </div>
        )}

        {!loading && !error && paragraphs.length > 0 && (
          <div
            className={`font-serif leading-[1.8] ${fontSize} space-y-[1.5em]`}
          >
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        )}
      </main>

      {/* Footer — progress % */}
      {!loading && paragraphs.length > 0 && (
        <div
          className={`fixed bottom-0 inset-x-0 text-center py-2 text-xs ${t.secondary} ${t.header} border-t ${t.border} transition-all duration-200 ${
            showControls ? "translate-y-0" : "translate-y-full"
          }`}
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          {Math.round(progress)}% read
        </div>
      )}
    </div>
  );
}

export default function ReadPage() {
  return (
    <Suspense>
      <ReaderContent />
    </Suspense>
  );
}
