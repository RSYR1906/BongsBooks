import type { BookInsert } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const ALLOWED_FIELDS = [
  "title",
  "author",
  "description",
  "genre",
  "cover_url",
  "isbn",
  "published_date",
  "page_count",
  "read_url",
  "status",
] as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  const update: Partial<BookInsert> = {};
  for (const field of ALLOWED_FIELDS) {
    if (field in body) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (update as any)[field] = body[field];
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  const { data, error } = await getSupabase()
    .from("books")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ book: data });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const { error } = await getSupabase().from("books").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
