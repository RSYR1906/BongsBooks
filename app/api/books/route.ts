import type { BookInsert } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/** Normalize a genre string: trim + collapse spaces + title-case */
function normalizeGenre(g: string): string {
  return g
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

export async function POST(request: NextRequest) {
  const body: BookInsert = await request.json();

  if (!body.title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // ── Duplicate detection ───────────────────────────────────────────────────
  // Check by ISBN first (most reliable), then by google_books_id
  if (body.isbn) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("isbn", body.isbn)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Already in library", duplicate: true, existingId: existing.id },
        { status: 409 },
      );
    }
  } else if (body.google_books_id) {
    const { data: existing } = await supabase
      .from("books")
      .select("id")
      .eq("google_books_id", body.google_books_id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "Already in library", duplicate: true, existingId: existing.id },
        { status: 409 },
      );
    }
  }

  // ── Genre normalization ───────────────────────────────────────────────────
  if (Array.isArray(body.genre)) {
    const seen = new Set<string>();
    body.genre = body.genre
      .map(normalizeGenre)
      .filter((g) => {
        if (!g || seen.has(g.toLowerCase())) return false;
        seen.add(g.toLowerCase());
        return true;
      });
  }

  const { data, error } = await supabase
    .from("books")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ book: data }, { status: 201 });
}
