import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

type OLTextField = string | { value: string } | undefined;

function extractText(field: OLTextField): string | null {
  if (!field) return null;
  return typeof field === "string" ? field : field.value;
}

export async function GET(request: NextRequest) {
  const title = request.nextUrl.searchParams.get("title") ?? "";
  const author = request.nextUrl.searchParams.get("author") ?? "";

  if (!title) return NextResponse.json({ description: null });

  const q = [title, author].filter(Boolean).join(" ");
  const url =
    `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}` +
    `&fields=description,first_sentence&limit=1`;

  try {
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return NextResponse.json({ description: null });

    const data = (await res.json()) as {
      docs?: Array<{
        description?: OLTextField;
        first_sentence?: OLTextField;
      }>;
    };

    const doc = data.docs?.[0];
    const description =
      extractText(doc?.description) ??
      extractText(doc?.first_sentence) ??
      null;

    return NextResponse.json({ description });
  } catch {
    return NextResponse.json({ description: null });
  }
}
