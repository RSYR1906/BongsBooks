export interface GoogleBookVolume {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    description?: string;
    publishedDate?: string;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

export interface BookFormData {
  title: string;
  author: string;
  isbn: string;
  cover_url: string;
  description: string;
  genre: string[];
  published_date: string;
  page_count: number | null;
  google_books_id: string;
  open_library_key: string;
  read_url: string;
}

export function extractIsbn(volume: GoogleBookVolume): string {
  const identifiers = volume.volumeInfo.industryIdentifiers ?? [];
  const isbn13 = identifiers.find((i) => i.type === "ISBN_13");
  const isbn10 = identifiers.find((i) => i.type === "ISBN_10");
  return isbn13?.identifier ?? isbn10?.identifier ?? "";
}

export function volumeToFormData(volume: GoogleBookVolume): BookFormData {
  const info = volume.volumeInfo;
  const rawThumbnail = info.imageLinks?.thumbnail ?? "";
  // Force HTTPS so next/image remote patterns work
  const cover_url = rawThumbnail.replace(/^http:/, "https:");

  return {
    title: info.title ?? "",
    author: (info.authors ?? []).join(", "),
    isbn: extractIsbn(volume),
    cover_url,
    description: info.description ?? "",
    genre: info.categories ?? [],
    published_date: info.publishedDate ?? "",
    page_count: info.pageCount ?? null,
    google_books_id: volume.id,
    open_library_key: "",
    read_url: "",
  };
}
