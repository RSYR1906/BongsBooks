"use client";

import Image from "next/image";

export type AddState = "idle" | "saving" | "saved" | "error";

interface Props {
  title: string;
  author?: string;
  cover_url?: string | null;
  read_url?: string | null;
  addState: AddState;
  onAdd: () => void;
}

export default function DiscoverBookCard({
  title,
  author,
  cover_url,
  read_url,
  addState,
  onAdd,
}: Props) {
  return (
    <div className="flex flex-col">
      {/* Cover */}
      <div className="aspect-[2/3] relative rounded-xl overflow-hidden shadow-md">
        {cover_url ? (
          <Image
            src={cover_url}
            alt={title}
            fill
            sizes="(max-width: 640px) 33vw, 25vw"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-b from-walnut-mid to-walnut">
            <span className="text-3xl">📕</span>
            <span className="text-xs text-amber-200 mt-1 line-clamp-3 font-serif leading-tight">
              {title}
            </span>
          </div>
        )}
        {read_url && (
          <div className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide shadow">
            Free
          </div>
        )}
      </div>

      {/* Title + author */}
      <p className="mt-1.5 text-xs font-semibold text-walnut line-clamp-2 leading-tight font-serif">
        {title}
      </p>
      {author && (
        <p className="text-[11px] text-walnut-mid line-clamp-1">{author}</p>
      )}

      {/* Action buttons */}
      <div className="mt-2 flex gap-1.5">
        {read_url && (
          <a
            href={read_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg py-1.5 leading-none hover:bg-emerald-100 transition-colors"
          >
            Read →
          </a>
        )}
        <button
          onClick={onAdd}
          disabled={addState === "saving" || addState === "saved"}
          className={`flex-1 text-center text-[10px] font-semibold rounded-lg py-1.5 leading-none transition-all active:scale-95 ${
            addState === "saved"
              ? "bg-green-100 text-green-700 border border-green-200"
              : addState === "error"
                ? "bg-red-50 text-red-600 border border-red-200"
                : addState === "saving"
                  ? "bg-gold/20 text-walnut-mid border border-gold/20"
                  : "bg-gold text-white shadow-sm hover:bg-gold-light"
          }`}
        >
          {addState === "saved"
            ? "✓ Added"
            : addState === "saving"
              ? "…"
              : addState === "error"
                ? "Retry"
                : "+ Add"}
        </button>
      </div>
    </div>
  );
}
