import type { GoogleBookVolume } from "@/lib/books";
import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

async function fetchGoogleBooks(
  query: string,
  apiKey: string | undefined
): Promise<GoogleBookVolume[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
    query
  )}&maxResults=10&orderBy=relevance${apiKey ? `&key=${apiKey}` : ""}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items ?? []) as GoogleBookVolume[];
  } catch {
    return [];
  }
}

export async function GET() {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;

  const { data: books, error } = await getSupabase()
    .from("books")
    .select("title, author, genre, google_books_id, isbn");

  if (error || !books || books.length === 0) {
    const fallback = await fetchGoogleBooks("subject:classic fiction bestseller", apiKey);
    return NextResponse.json({ results: fallback, basis: null });
  }

  // Genre frequency map
  const genreMap = new Map<string, number>();
  books.forEach((b) => {
    (b.genre ?? []).forEach((g: string) =>
      genreMap.set(g, (genreMap.get(g) ?? 0) + 1)
    );
  });

  // Author frequency map (split "Author A, Author B" into individuals)
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

  const topAuthor = [...authorMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([a]) => a)[0] ?? null;

  // Owned identifiers for deduplication
  const ownedGoogleIds = new Set(
    books.map((b) => b.google_books_id).filter(Boolean)
  );
  const ownedIsbns = new Set(books.map((b) => b.isbn).filter(Boolean));
  const ownedTitles = new Set(
    books.map((b) => b.title.toLowerCase().trim())
  );

  // Build query list
  const queries: string[] = [];
  topGenres.forEach((g) => queries.push(`subject:"${g}"`));
  if (topAuthor) queries.push(`inauthor:"${topAuthor}"`);
  if (queries.length === 0) queries.push("subject:fiction bestseller");

  const allResults = await Promise.all(
    queries.map((q) => fetchGoogleBooks(q, apiKey))
  );

  // Merge, deduplicate, filter already-owned
  const seen = new Set<string>();
  const recommendations: GoogleBookVolume[] = [];

  for (const batch of allResults) {
    for (const vol of batch) {
      if (seen.has(vol.id)) continue;
      if (ownedGoogleIds.has(vol.id)) continue;
      if (ownedTitles.has(vol.volumeInfo.title.toLowerCase().trim())) continue;

      const isbns = (vol.volumeInfo.industryIdentifiers ?? []).map(
        (i) => i.identifier
      );
      if (isbns.some((isbn) => ownedIsbns.has(isbn))) continue;

      seen.add(vol.id);
      recommendations.push(vol);
      if (recommendations.length >= 20) break;
    }
    if (recommendations.length >= 20) break;
  }

  const basis =
    topGenres.length > 0 ? topGenres.join(", ") : topAuthor ?? null;

  return NextResponse.json({ results: recommendations, basis });
}
