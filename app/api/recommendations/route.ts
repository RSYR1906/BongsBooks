import type { GoogleBookVolume } from "@/lib/books";
import { getSupabase } from "@/lib/supabase";
import { GoogleGenAI } from "@google/genai";
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

interface GeminiResult {
  queries: string[];
  basis: string;
}

async function getGeminiQueries(
  topGenres: string[],
  topAuthors: string[],
  sampleTitles: string[],
): Promise<GeminiResult | null> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) return null;

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey });
    const libraryProfile = [
      topGenres.length > 0 ? `Favourite genres: ${topGenres.join(", ")}` : null,
      topAuthors.length > 0
        ? `Favourite authors: ${topAuthors.join(", ")}`
        : null,
      sampleTitles.length > 0
        ? `Recent books: ${sampleTitles.join(", ")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n");

    const prompt = `You are a book recommendation assistant. Based on this reader's library profile, generate 3-4 Google Books API search query strings that will surface great book recommendations they haven't read yet.

Library profile:
${libraryProfile}

Rules:
- Each query must be a valid Google Books API query string (e.g. "subject:\"dark academia\"", "inauthor:\"Ursula K. Le Guin\"", "subject:\"hard sci-fi\"")
- Queries should be specific and diverse — mix genres, sub-genres, and authors
- Do NOT repeat the exact genres/authors already in the profile; explore adjacent territory
- Return ONLY valid JSON with this exact shape: { "queries": ["...", "..."], "basis": "short human-readable summary like 'Gothic fiction & dystopian sci-fi'" }`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" },
    });

    const text = response.text ?? "";
    const parsed = JSON.parse(text) as GeminiResult;
    if (!Array.isArray(parsed.queries) || parsed.queries.length === 0)
      return null;
    return parsed;
  } catch (err) {
    console.error("Gemini query generation failed:", err);
    return null;
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

  // Build query list — try Gemini first (only on first page to avoid extra API calls)
  let queries: string[] = [];
  let geminiBasis: string | null = null;

  if (offset === 0) {
    const topAuthors = [...authorMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([a]) => a);
    const sampleTitles = books
      .slice(-5)
      .map((b) => b.title)
      .filter(Boolean);

    const gemini = await getGeminiQueries(topGenres, topAuthors, sampleTitles);
    if (gemini) {
      queries = gemini.queries;
      geminiBasis = gemini.basis;
      console.log("Gemini queries:", queries, "basis:", geminiBasis);
    }
  }

  // Fallback to algorithmic queries if Gemini was skipped or failed
  if (queries.length === 0) {
    topGenres.forEach((g) => queries.push(`subject:"${g}"`))
    if (topAuthor) queries.push(`inauthor:"${topAuthor}"`);
    if (queries.length === 0) queries.push("subject:fiction bestseller");
  }

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
    geminiBasis ??
    (topGenres.length > 0 ? topGenres.join(", ") : (topAuthor ?? null));

  return NextResponse.json({ results: recommendations, basis });
}
