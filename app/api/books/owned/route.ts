import { getSupabase } from "@/lib/supabase";
import { NextResponse } from "next/server";

/**
 * GET /api/books/owned
 * Returns a lightweight list of owned books for client-side duplicate detection.
 * Only returns the fields needed for matching — not full book data.
 */
export async function GET() {
  const { data, error } = await getSupabase()
    .from("books")
    .select("id, title, isbn, google_books_id, collections");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ books: data ?? [] });
}
