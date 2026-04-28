import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=10${apiKey ? `&key=${apiKey}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "Google Books API error" }, { status: 502 });
  }

  const data = await res.json();
  return NextResponse.json({ items: data.items ?? [] });
}
