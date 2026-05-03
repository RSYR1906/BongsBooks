import type { GoogleBookVolume } from "@/lib/books";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Matches CJK Unified Ideographs (common + extension A)
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

// ─── Open Library types ───────────────────────────────────────────────────────

interface OLDoc {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  isbn?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  subject?: string[];
}

// Convert Open Library doc → GoogleBookVolume shape so the client needs no changes
function olDocToVolume(doc: OLDoc): GoogleBookVolume {
  const workId = doc.key.replace("/works/", "");
  return {
    id: `ol-${workId}`,
    volumeInfo: {
      title: doc.title,
      authors: doc.author_name,
      publishedDate: doc.first_publish_year
        ? String(doc.first_publish_year)
        : undefined,
      pageCount: doc.number_of_pages_median,
      categories: doc.subject?.slice(0, 3),
      imageLinks: doc.cover_i
        ? {
            thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
            smallThumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-S.jpg`,
          }
        : undefined,
      industryIdentifiers: doc.isbn?.slice(0, 2).map((isbn) => ({
        type: isbn.length === 13 ? "ISBN_13" : "ISBN_10",
        identifier: isbn,
      })),
    },
  };
}

async function searchOpenLibrary(
  q: string,
  signal: AbortSignal,
): Promise<GoogleBookVolume[]> {
  const url =
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}` +
    `&language=chi&limit=15` +
    `&fields=key,title,author_name,cover_i,isbn,first_publish_year,number_of_pages_median,subject`;
  try {
    const res = await fetch(url, { cache: "no-store", signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { docs?: OLDoc[] };
    return (data.docs ?? []).map(olDocToVolume);
  } catch {
    return []; // OL is best-effort — never fail the whole request
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const chinese = hasChinese(q);
  const langParam = chinese ? "&langRestrict=zh" : "";
  const maxResults = chinese ? 15 : 10;
  const googleUrl =
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}` +
    `&maxResults=${maxResults}${langParam}${apiKey ? `&key=${apiKey}` : ""}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    // For Chinese queries fire both APIs in parallel; for English just Google
    const [googleRes, olItems] = await Promise.all([
      fetch(googleUrl, { cache: "no-store", signal: controller.signal }),
      chinese ? searchOpenLibrary(q, controller.signal) : Promise.resolve([]),
    ]);

    // Retry once on transient Google errors (503 Service Unavailable, 429 rate limit)
    let finalGoogleRes = googleRes;
    if (!googleRes.ok && (googleRes.status === 503 || googleRes.status === 429)) {
      console.warn(`[search] Google Books returned ${googleRes.status}, retrying once…`);
      await new Promise((r) => setTimeout(r, 600));
      finalGoogleRes = await fetch(googleUrl, {
        cache: "no-store",
        signal: controller.signal,
      }).catch(() => googleRes);
    }

    clearTimeout(timer);

    if (!finalGoogleRes.ok) {
      const body = await finalGoogleRes.text().catch(() => "");
      console.error(
        `[search] Google Books returned ${finalGoogleRes.status}: ${body.slice(0, 200)}`,
      );
      // If Google fails but we have OL results, return those
      if (olItems.length > 0) {
        return NextResponse.json({ items: olItems });
      }
      return NextResponse.json(
        { error: `Google Books API error (${finalGoogleRes.status})` },
        { status: 502 },
      );
    }

    const googleData = (await finalGoogleRes.json()) as { items?: GoogleBookVolume[] };
    const googleItems: GoogleBookVolume[] = googleData.items ?? [];

    if (!chinese || olItems.length === 0) {
      return NextResponse.json({ items: googleItems });
    }

    // Deduplicate OL results against Google results by ISBN
    const googleIsbns = new Set<string>();
    for (const item of googleItems) {
      for (const id of item.volumeInfo.industryIdentifiers ?? []) {
        googleIsbns.add(id.identifier);
      }
    }
    const olDeduped = olItems.filter((item) => {
      const isbns = item.volumeInfo.industryIdentifiers ?? [];
      // If OL item has no ISBNs we can't deduplicate — include it
      return (
        isbns.length === 0 || !isbns.some((id) => googleIsbns.has(id.identifier))
      );
    });

    return NextResponse.json({ items: [...googleItems, ...olDeduped] });
  } catch (err) {
    clearTimeout(timer); // ensure timer is cleared on any early-exit path
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.error("[search] fetch error:", isTimeout ? "timeout" : err);
    return NextResponse.json(
      { error: isTimeout ? "Search timed out" : "Network error" },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
