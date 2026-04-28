import AppShell from "@/app/components/AppShell";
import ExpandableDescription from "@/app/components/ExpandableDescription";
import type { Book } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";
import Image from "next/image";
import { notFound } from "next/navigation";
import DeleteBookButton from "./DeleteBookButton";

export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BookPage({ params }: Props) {
  const { id } = await params;
  const { data: book, error } = await getSupabase()
    .from("books")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !book) {
    notFound();
  }

  const b = book as Book;
  const amazonQuery = encodeURIComponent(`${b.title} ${b.author ?? ""}`);
  const amazonUrl = `https://www.amazon.com/s?k=${amazonQuery}`;
  const isGoogleCover = b.cover_url?.includes("books.google.com") ?? false;

  return (
    <AppShell title={b.title} backHref="/">
      {/* Hero with blurred cover background */}
      <div className="relative h-40 bg-walnut overflow-hidden">
        {b.cover_url && (
          <Image
            src={b.cover_url}
            alt=""
            fill
            className="object-cover scale-110 blur-2xl opacity-30"
            unoptimized={isGoogleCover}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-walnut/50 to-parchment/96" />
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Cover card — overlaps hero */}
        <div className="flex justify-center -mt-20 mb-5">
          <div className="w-28 aspect-[2/3] relative rounded-xl overflow-hidden shadow-2xl border border-white/10 shrink-0">
            {b.cover_url ? (
              <Image
                src={b.cover_url}
                alt={b.title}
                fill
                sizes="112px"
                className="object-cover"
                unoptimized={isGoogleCover}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-[#3A1800] to-[#1C0800] text-4xl">
                📕
              </div>
            )}
          </div>
        </div>

        {/* Title + meta */}
        <div className="text-center mb-5">
          <h2 className="font-serif text-2xl font-bold text-walnut leading-tight">
            {b.title}
          </h2>
          {b.author && (
            <p className="text-walnut-mid font-medium mt-1">{b.author}</p>
          )}
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-0.5 text-xs text-walnut-mid/70">
            {b.published_date && <span>Published {b.published_date}</span>}
            {b.page_count && <span>{b.page_count} pages</span>}
            {b.isbn && <span>ISBN {b.isbn}</span>}
          </div>
          {b.genre && b.genre.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {b.genre.map((g) => (
                <span
                  key={g}
                  className="text-xs bg-[#F5EDDA] text-walnut font-serif border-l-2 border-gold px-2.5 py-0.5 rounded-r-md font-medium"
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="space-y-2.5 mb-6">
          {b.read_url ? (
            <a
              href={b.read_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-gold hover:bg-gold-light active:scale-[0.98] text-white font-semibold py-3 rounded-2xl transition-all shadow-lg"
            >
              📖 Read Online — Free
            </a>
          ) : (
            <>
              <div className="bg-[#FFFDF7] border border-[#EDE5D0] rounded-2xl p-3.5 text-center text-sm text-walnut-mid">
                No free digital copy found for this book.
              </div>
              <a
                href={amazonUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#F5EDDA] hover:bg-[#EDE5D0] active:scale-[0.98] text-walnut font-medium py-2.5 rounded-2xl transition-all text-sm"
              >
                Find on Amazon →
              </a>
            </>
          )}
        </div>

        {/* Description */}
        {b.description && (
          <div className="mb-5 bg-[#FFFDF7] border border-[#EDE5D0] rounded-2xl p-4">
            <h3 className="font-serif font-semibold text-walnut mb-2">
              About this book
            </h3>
            <ExpandableDescription text={b.description} />
          </div>
        )}

        {/* Danger zone */}
        <div className="mb-10">
          <DeleteBookButton id={b.id} />
        </div>
      </div>
    </AppShell>
  );
}
