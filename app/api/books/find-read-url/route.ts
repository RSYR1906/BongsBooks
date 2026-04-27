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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const isbn = searchParams.get("isbn") ?? "";
  const title = searchParams.get("title") ?? "";
  const author = searchParams.get("author") ?? "";

  // 1. Try Open Library by ISBN
  if (isbn) {
    try {
      const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;
      const olRes = await fetch(olUrl, { next: { revalidate: 86400 } });
      if (olRes.ok) {
        const olData: Record<string, OpenLibraryBookData> = await olRes.json();
        const key = `ISBN:${isbn}`;
        const bookData = olData[key];
        if (bookData) {
          const readUrl =
            bookData.read_url ??
            bookData.ebooks?.[0]?.read_url ??
            bookData.ebooks?.[0]?.preview_url;
          if (readUrl) {
            return NextResponse.json({ url: readUrl, source: "openlibrary" });
          }
        }
      }
    } catch {
      // continue to next source
    }
  }

  // 2. Try Gutendex (Project Gutenberg) by title + author
  if (title) {
    try {
      const searchQuery = [title, author].filter(Boolean).join(" ");
      const gutUrl = `https://gutendex.com/books?search=${encodeURIComponent(searchQuery)}`;
      const gutRes = await fetch(gutUrl, { next: { revalidate: 86400 } });
      if (gutRes.ok) {
        const gutData: { results: GutendexResult[] } = await gutRes.json();
        const match = gutData.results?.find((r) => {
          const titleMatch = r.title.toLowerCase().includes(title.toLowerCase());
          return titleMatch && r.copyright === false;
        });
        if (match) {
          // Prefer HTML, then epub, then text
          const formats = match.formats;
          const readUrl =
            formats["text/html"] ??
            formats["application/epub+zip"] ??
            formats["text/plain; charset=utf-8"] ??
            formats["text/plain"];
          if (readUrl) {
            return NextResponse.json({ url: readUrl, source: "gutenberg" });
          }
        }
      }
    } catch {
      // continue
    }
  }

  return NextResponse.json({ url: null });
}
