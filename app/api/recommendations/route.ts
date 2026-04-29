import type { GoogleBookVolume } from "@/lib/books";
import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

// Vercel free tier: 10s max. Keep well under that.
const TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("timeout")), ms),
    ),
  ]);
}

async function fetchGoogleBooks(
  query: string,
  apiKey: string | undefined,
  startIndex = 0,
): Promise<GoogleBookVolume[]> {
  const url =
    `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}` +
    `&maxResults=15&startIndex=${startIndex}&orderBy=relevance${apiKey ? `&key=${apiKey}` : ""}`;
  try {
    // cache: "no-store" — never serve a stale cached response on Vercel
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) {
      console.error(`Google Books API error ${res.status} for query: ${query}`);
      return [];
    }
    const data = await res.json();
    return (data.items ?? []) as GoogleBookVolume[];
  } catch (err) {
    console.error("fetchGoogleBooks threw:", err);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10));
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  try {
    return await withTimeout(buildResponse(apiKey, offset), TIMEOUT_MS);
  } catch {
    // Timeout or unexpected error — return generic fallback
    return NextResponse.json({ results: [], basis: null });
  }
}

async function buildResponse(apiKey: string | undefined, offset: number) {
  const { data: books, error } = await getSupabase()
    .from("books")
    .select("title, author, genre, google_books_id, isbn");

  if (error) {
    console.error("Supabase error in recommendations:", error.message);
  }

  if (error || !books || books.length === 0) {
    const fallback = await fetchGoogleBooks(
      "subject:fiction bestseller popular",
      apiKey,
      offset,
    );
    return NextResponse.json({ results: fallback, basis: null });
  }

  // Genre frequency map
  const genreMap = new Map<string, number>();
  books.forEach((b) => {
    (b.genre ?? []).forEach((g: string) =>
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1),
    );
  });

  // Author frequency map
  const authorMap = new Map<string, number>();
  books.forEach((b) => {
    if (b.author) {
      b.author.split(",").forEach((a: string) => {
        const name = a.trim();
        if (name) authorMap.set(name, (authorMap.get(name) ?? 0) + 1);
      });
    }
  });

  const topGenres = [...genreMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([g]) => g);

  const topAuthor =
    [...authorMap.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Owned identifiers for deduplication
  const ownedGoogleIds = new Set(
    books.map((b) => b.google_books_id).filter(Boolean),
  );
  const ownedIsbns = new Set(books.map((b) => b.isbn).filter(Boolean));
  const ownedTitles = new Set(books.map((b) => b.title.toLowerCase().trim()));

  // Build query list — genres first, then author
  const queries: string[] = [];
  topGenres.forEach((g) => queries.push(`subject:"${g}"`));
  if (topAuthor) queries.push(`inauthor:"${topAuthor}"`);
  if (queries.length === 0) queries.push("subject:fiction bestseller");

  const allResults = await Promise.all(
    queries.map((q) => fetchGoogleBooks(q, apiKey, offset)),
  );

  // Merge and deduplicate, skip already-owned
  const seen = new Set<string>();
  const recommendations: GoogleBookVolume[] = [];

  for (const batch of allResults) {
    for (const vol of batch) {
      if (seen.has(vol.id)) continue;
      if (ownedGoogleIds.has(vol.id)) continue;
      if (ownedTitles.has(vol.volumeInfo.title.toLowerCase().trim())) continue;

      const isbns = (vol.volumeInfo.industryIdentifiers ?? []).map(
        (i) => i.identifier,
      );
      if (isbns.some((isbn) => ownedIsbns.has(isbn))) continue;

      seen.add(vol.id);
      recommendations.push(vol);
      if (recommendations.length >= 20) break;
    }
    if (recommendations.length >= 20) break;
  }

  // If all personalized queries returned nothing, try a generic fallback
  if (recommendations.length === 0) {
    const fallback = await fetchGoogleBooks(
      "subject:fiction bestseller popular",
      apiKey,
      offset,
    );
    return NextResponse.json({ results: fallback, basis: null });
  }

  const basis =
    topGenres.length > 0 ? topGenres.join(", ") : (topAuthor ?? null);

  return NextResponse.json({ results: recommendations, basis });
}
