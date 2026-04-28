import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface OpenLibraryBookData {
  read_url?: string;
  ebooks?: Array<{ read_url?: string; preview_url?: string }>;
}

interface GutendexResult {
  title: string;
  copyright: boolean | null;
  formats: Record<string, string>;
}

interface OLSearchDoc {
  ia?: string[];
  lending_identifier_s?: string;
}

// Hard cap: never let this route run longer than 7 s on Vercel free tier
const TIMEOUT_MS = 7000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const isbn = searchParams.get("isbn") ?? "";
  const title = searchParams.get("title") ?? "";
  const author = searchParams.get("author") ?? "";

  try {
    const url = await withTimeout(resolveReadUrl(isbn, title, author), TIMEOUT_MS);
    return NextResponse.json(url ? { url } : {});
  } catch {
    return NextResponse.json({});
  }
}

async function resolveReadUrl(
  isbn: string,
  title: string,
  author: string,
): Promise<string | null> {

  // 1. Try Open Library by ISBN — checks ebook/read_url fields
  if (isbn) {
    try {
      const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;
      const olRes = await fetch(olUrl, { cache: "force-cache" });
      if (olRes.ok) {
        const olData: Record<string, OpenLibraryBookData> = await olRes.json();
        const bookData = olData[`ISBN:${isbn}`];
        if (bookData) {
          const readUrl =
            bookData.read_url ??
            bookData.ebooks?.[0]?.read_url ??
            bookData.ebooks?.[0]?.preview_url;
          if (readUrl) return readUrl;
        }
      }
    } catch {
      // continue
    }
  }

  // 2. Try Open Library full-text search → IA identifier (limit to first doc only to stay fast)
  if (title) {
    try {
      const olSearchParams = new URLSearchParams({
        q: [title, author].filter(Boolean).join(" "),
        has_fulltext: "true",
        fields: "key,title,ia,lending_identifier_s",
        limit: "3",
      });
      const olSearchRes = await fetch(
        `https://openlibrary.org/search.json?${olSearchParams}`,
        { cache: "force-cache" },
      );
      if (olSearchRes.ok) {
        const olSearchData: { docs: OLSearchDoc[] } = await olSearchRes.json();
        // Only check the first matching doc to avoid serial loop timeouts
        const doc = olSearchData.docs?.[0];
        const iaId = doc?.ia?.[0] ?? doc?.lending_identifier_s ?? null;
        if (iaId) {
          return `https://archive.org/details/${iaId}`;
        }
      }
    } catch {
      // continue
    }
  }

  // 3. Try Gutendex (Project Gutenberg) by title + author
  if (title) {
    try {
      const searchQuery = [title, author].filter(Boolean).join(" ");
      const gutRes = await fetch(
        `https://gutendex.com/books?search=${encodeURIComponent(searchQuery)}`,
        { cache: "force-cache" },
      );
      if (gutRes.ok) {
        const gutData: { results: GutendexResult[] } = await gutRes.json();
        const match = gutData.results?.find(
          (r) =>
            r.title.toLowerCase().includes(title.toLowerCase()) &&
            r.copyright === false,
        );
        if (match) {
          const formats = match.formats;
          const readUrl =
            formats["text/html"] ??
            formats["application/epub+zip"] ??
            formats["text/plain; charset=utf-8"] ??
            formats["text/plain"];
          if (readUrl) return readUrl;
        }
      }
    } catch {
      // continue
    }
  }

  return null;
}

