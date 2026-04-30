import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabase } from "@/lib/supabase";
import type { BookInsert } from "@/lib/database.types";

export async function POST(request: NextRequest) {
  const body: { books: BookInsert[] } = await request.json();
  const books = body.books;

  if (!Array.isArray(books) || books.length === 0) {
    return NextResponse.json({ error: "No books provided" }, { status: 400 });
  }

  const valid = books.filter((b) => b.title?.trim());
  if (valid.length === 0) {
    return NextResponse.json(
      { error: "No valid books (title required)" },
      { status: 400 }
    );
  }

  const { data, error } = await getSupabase()
    .from("books")
    .insert(valid)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: data?.length ?? 0 }, { status: 201 });
}
