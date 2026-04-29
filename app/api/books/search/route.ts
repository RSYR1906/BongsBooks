import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Matches CJK Unified Ideographs (most common Chinese characters)
function hasChinese(text: string): boolean {
  return /[\u4e00-\u9fff\u3400-\u4dbf]/.test(text);
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q) {
    return NextResponse.json({ items: [] });
  }

  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const chinese = hasChinese(q);
  const langParam = chinese ? "&langRestrict=zh" : "";
  const maxResults = chinese ? 20 : 10;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=${maxResults}${langParam}${apiKey ? `&key=${apiKey}` : ""}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, { cache: "no-store", signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[search] Google Books returned ${res.status}: ${body.slice(0, 200)}`);
      return NextResponse.json(
        { error: `Google Books API error (${res.status})` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json({ items: data.items ?? [] });
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err instanceof Error && err.name === "AbortError";
    console.error("[search] fetch error:", isTimeout ? "timeout" : err);
    return NextResponse.json(
      { error: isTimeout ? "Search timed out" : "Network error" },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
