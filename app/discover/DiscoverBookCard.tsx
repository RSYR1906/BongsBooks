"use client";

import Image from "next/image";

export type AddState = "idle" | "saving" | "saved" | "error";

export interface FreeBook {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  read_url: string | null;
  subjects: string[];
  source: "gutenberg" | "standard" | "archive";
  description?: string | null;
}

interface Props {
  title: string;
  author?: string;
  cover_url?: string | null;
  read_url?: string | null;
  addState: AddState;
  onAdd: () => void;
  onInfo?: () => void;
  inLibrary?: boolean;
}

export default function DiscoverBookCard({
  title,
  author,
  cover_url,
  read_url,
  addState,
  onAdd,
  onInfo,
  inLibrary = false,
}: Props) {
  return (
    <div className="flex flex-col">
      {/* Tappable cover + title area */}
      <button
        onClick={onInfo}
        disabled={!onInfo}
        className="text-left disabled:cursor-default"
      >
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
            <div className="absolute inset-0 flex items-center justify-center bg-[#E8A830]/20">
              <span
                className="text-5xl font-bold text-[#E8A830] select-none"
                style={{ fontFamily: "Lora, Georgia, serif" }}
              >
                {title.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {read_url && (
            <div className="absolute top-1.5 left-1.5 bg-[#8D8D93] text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-md uppercase tracking-wide shadow">
              Free
            </div>
          )}
          {onInfo && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
          )}
        </div>

        <p className="mt-1.5 text-xs font-semibold text-[#3D3D45] line-clamp-2 leading-tight font-serif">
          {title}
        </p>
        {author && (
          <p className="text-[11px] text-[#8D8D93] line-clamp-1">{author}</p>
        )}
      </button>

      {/* Add / in-library button */}
      <div className="mt-2">
        {inLibrary ? (
          <div className="w-full text-center text-[10px] font-semibold rounded-lg py-1.5 leading-none bg-green-100 text-green-700 border border-green-200">
            ✓ In Library
          </div>
        ) : (
          <button
            onClick={onAdd}
            disabled={addState === "saving" || addState === "saved"}
            className={`w-full text-center text-[10px] font-semibold rounded-lg py-1.5 leading-none transition-all active:scale-95 ${
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
        )}
      </div>
    </div>
  );
}
