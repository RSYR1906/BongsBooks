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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const isbn = searchParams.get("isbn") ?? "";
  const title = searchParams.get("title") ?? "";
  const author = searchParams.get("author") ?? "";

  // 1. Try Open Library by ISBN — checks ebook/read_url fields
  if (isbn) {
    try {
      const olUrl = `https://openlibrary.org/api/books?bibkeys=ISBN:${encodeURIComponent(isbn)}&jscmd=data&format=json`;
      const olRes = await fetch(olUrl, { next: { revalidate: 86400 } });
      if (olRes.ok) {
        const olData: Record<string, OpenLibraryBookData> = await olRes.json();
        const bookData = olData[`ISBN:${isbn}`];
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
      // continue
    }
  }

  // 2. Try Open Library full-text search — finds books with freely readable
  //    Internet Archive copies (has_fulltext=true returns books backed by IA)
  if (title) {
    try {
      const olSearchParams = new URLSearchParams({
        q: [title, author].filter(Boolean).join(" "),
        has_fulltext: "true",
        fields: "key,title,ia,lending_identifier_s",
        limit: "5",
      });
      const olSearchRes = await fetch(
        `https://openlibrary.org/search.json?${olSearchParams}`,
        { next: { revalidate: 86400 } }
      );
      if (olSearchRes.ok) {
        const olSearchData: { docs: OLSearchDoc[] } = await olSearchRes.json();
        for (const doc of olSearchData.docs ?? []) {
          // Prefer a non-borrow (open access) IA identifier if available
          const iaId = doc.ia?.[0] ?? doc.lending_identifier_s ?? null;
          if (iaId) {
            // Verify the item is freely accessible (not borrow-only)
            const metaRes = await fetch(
              `https://archive.org/metadata/${iaId}/metadata`,
              { next: { revalidate: 86400 } }
            );
            if (metaRes.ok) {
              const meta: { result?: { access_restricted_item?: string } } =
                await metaRes.json();
              if (meta.result?.access_restricted_item !== "true") {
                return NextResponse.json({
                  url: `https://archive.org/details/${iaId}`,
                  source: "archive",
                });
              }
            }
          }
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
        { next: { revalidate: 86400 } }
      );
      if (gutRes.ok) {
        const gutData: { results: GutendexResult[] } = await gutRes.json();
        const match = gutData.results?.find(
          (r) =>
            r.title.toLowerCase().includes(title.toLowerCase()) &&
            r.copyright === false
        );
        if (match) {
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

