import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── Gutendex (Project Gutenberg) ────────────────────────────────────────────

interface GutendexAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  results: GutendexBook[];
}

function reverseAuthorName(name: string): string {
  const parts = name.split(",").map((s) => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

async function fetchGutendex(q: string, page: number) {
  const params = new URLSearchParams({ copyright: "false", page: String(page) });
  if (q.trim()) params.set("search", q.trim());

  const res = await fetch(`https://gutendex.com/books?${params}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error("Gutendex error");

  const data: GutendexResponse = await res.json();

  const results = data.results.map((book) => {
    const author =
      book.authors.length > 0
        ? reverseAuthorName(book.authors[0].name)
        : "Unknown";
    const cover_url = book.formats["image/jpeg"] ?? null;
    const read_url =
      book.formats["text/html"] ??
      book.formats["text/plain; charset=utf-8"] ??
      book.formats["text/plain"] ??
      null;
    return {
      id: String(book.id),
      title: book.title,
      author,
      cover_url,
      read_url,
      subjects: book.subjects.slice(0, 3),
      source: "gutenberg" as const,
    };
  });

  return { results, hasMore: data.next !== null };
}

// ─── Internet Archive ─────────────────────────────────────────────────────────

interface ArchiveDoc {
  identifier: string;
  title?: string;
  creator?: string | string[];
  subject?: string | string[];
}

interface ArchiveResponse {
  response?: {
    docs: ArchiveDoc[];
    numFound: number;
  };
}

const ARCHIVE_CATEGORIES = [
  "fiction",
  "science fiction",
  "mystery",
  "romance",
  "history",
  "biography",
  "science",
  "philosophy",
  "poetry",
  "adventure",
  "children",
  "art",
  "religion",
  "nature",
  "horror",
  "travel",
  "drama",
  "technology",
];

function randomArchiveCategory(): string {
  return ARCHIVE_CATEGORIES[Math.floor(Math.random() * ARCHIVE_CATEGORIES.length)];
}

async function fetchArchive(q: string, page: number, category?: string | null) {
  let query: string;
  if (q.trim()) {
    query = `(${q}) AND mediatype:texts`;
  } else if (category) {
    query = `subject:(${category}) AND mediatype:texts`;
  } else {
    query = `subject:(${randomArchiveCategory()}) AND mediatype:texts`;
  }

  const rows = 20;
  const start = (page - 1) * rows;

  // Internet Archive advanced search – build URL manually to handle fl[]
  const url =
    `https://archive.org/advancedsearch.php` +
    `?q=${encodeURIComponent(query)}` +
    `&fl[]=identifier&fl[]=title&fl[]=creator&fl[]=subject` +
    `&sort[]=downloads+desc` +
    `&rows=${rows}&start=${start}&output=json`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error("Archive.org error");

  const data: ArchiveResponse = await res.json();
  const docs = data.response?.docs ?? [];
  const numFound = data.response?.numFound ?? 0;

  const results = docs.map((doc) => {
    const rawAuthor = Array.isArray(doc.creator)
      ? doc.creator[0]
      : (doc.creator ?? "Unknown");
    const rawSubjects = Array.isArray(doc.subject)
      ? doc.subject
      : doc.subject
      ? [doc.subject]
      : [];
    return {
      id: doc.identifier,
      title: doc.title ?? doc.identifier,
      author: rawAuthor,
      cover_url: `https://archive.org/services/img/${doc.identifier}`,
      read_url: `https://archive.org/details/${doc.identifier}`,
      subjects: rawSubjects.slice(0, 3),
      source: "archive" as const,
    };
  });

  const hasMore = start + rows < numFound;
  return { results, hasMore };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const source = searchParams.get("source") ?? "gutenberg";
  const category = searchParams.get("category") ?? null;

  try {
    if (source === "archive") {
      const { results, hasMore } = await fetchArchive(q, page, category);
      return NextResponse.json({ results, nextPage: hasMore ? page + 1 : null });
    }

    // Default: gutenberg
    const { results, hasMore } = await fetchGutendex(q, page);
    return NextResponse.json({ results, nextPage: hasMore ? page + 1 : null });
  } catch {
    return NextResponse.json({ error: "Fetch error" }, { status: 502 });
  }
}
