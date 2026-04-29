import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// ─── Security allowlist ───────────────────────────────────────────────────────
// Only these hostnames may be fetched — prevents SSRF attacks.
const ALLOWED_HOSTS = new Set([
  "gutenberg.org",
  "www.gutenberg.org",
  "gutenberg.net.au",
  "www.gutenberg.net.au",
]);

function isAllowedUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    return u.protocol === "https:" && ALLOWED_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

// ─── HTML → plain text ────────────────────────────────────────────────────────
function htmlToText(html: string): string {
  // Drop everything before <body> (head, doctype)
  const bodyStart = html.search(/<body[^>]*>/i);
  if (bodyStart !== -1) {
    html = html.slice(html.indexOf(">", bodyStart) + 1);
  }

  // Block elements → paragraph breaks
  html = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|h[1-6]|section|article|blockquote|pre)[^>]*>/gi, "\n\n");

  // Strip all remaining tags
  html = html.replace(/<[^>]+>/g, "");

  // Decode common HTML entities
  html = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) =>
      String.fromCharCode(parseInt(n, 16)),
    );

  return html;
}

// ─── Strip Project Gutenberg boilerplate ─────────────────────────────────────
function stripGutenbergBoilerplate(text: string): string {
  // Strip header: everything up to and including the START marker line
  const startRe = /\*{3}\s*START OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i;
  const startMatch = startRe.exec(text);
  if (startMatch) {
    text = text.slice(startMatch.index + startMatch[0].length);
  }

  // Strip footer: everything from the END marker onwards
  const endRe = /\*{3}\s*END OF (THE|THIS) PROJECT GUTENBERG[^\n]*/i;
  const endMatch = endRe.exec(text);
  if (endMatch) {
    text = text.slice(0, endMatch.index);
  }

  return text.trim();
}

// ─── Text → paragraphs ───────────────────────────────────────────────────────
function toParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/[ \t]+/g, " ").replace(/\n/g, " ").trim())
    .filter((p) => p.length > 10); // skip blank lines / short artefacts
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isAllowedUrl(url)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "BookLibraryApp/1.0 (personal reading app)",
        Accept: "text/html,text/plain,*/*",
      },
      next: { revalidate: 86400 }, // cache 24 hours — book content never changes
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${res.status}` },
        { status: 502 },
      );
    }

    const raw = await res.text();
    const contentType = res.headers.get("content-type") ?? "";
    const isHtml =
      contentType.includes("text/html") ||
      /\.(html|htm)(\?|$)/i.test(url);

    const plainText = isHtml ? htmlToText(raw) : raw;
    const stripped = stripGutenbergBoilerplate(plainText);
    const paragraphs = toParagraphs(stripped);

    return NextResponse.json({ paragraphs, total: paragraphs.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch content" }, { status: 502 });
  }
}
