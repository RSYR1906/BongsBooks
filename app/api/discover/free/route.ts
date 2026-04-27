import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

interface GutendexAuthor {
  name: string;
  birth_year: number | null;
  death_year: number | null;
}

interface GutendexBook {
  id: number;
  title: string;
  authors: GutendexAuthor[];
  subjects: string[];
  formats: Record<string, string>;
  download_count: number;
}

interface GutendexResponse {
  count: number;
  next: string | null;
  results: GutendexBook[];
}

function reverseAuthorName(name: string): string {
  // "Austen, Jane" → "Jane Austen"
  const parts = name.split(",").map((s) => s.trim());
  return parts.length === 2 ? `${parts[1]} ${parts[0]}` : name;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const params = new URLSearchParams({
    copyright: "false",
    page: String(page),
  });
  if (q.trim()) params.set("search", q.trim());

  try {
    const res = await fetch(`https://gutendex.com/books?${params}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Gutendex API error" }, { status: 502 });
    }

    const data: GutendexResponse = await res.json();

    const results = data.results.map((book) => {
      const author =
        book.authors.length > 0
          ? reverseAuthorName(book.authors[0].name)
          : "Unknown";
      const cover_url = book.formats["image/jpeg"] ?? null;
      const read_url =
        book.formats["text/html"] ??
        book.formats["application/epub+zip"] ??
        book.formats["text/plain; charset=utf-8"] ??
        book.formats["text/plain"] ??
        null;

      return {
        id: book.id,
        title: book.title,
        author,
        cover_url,
        read_url,
        subjects: book.subjects.slice(0, 3),
        download_count: book.download_count,
      };
    });

    const nextPage = data.next ? page + 1 : null;
    return NextResponse.json({ results, nextPage });
  } catch {
    return NextResponse.json({ error: "Network error" }, { status: 502 });
  }
}
