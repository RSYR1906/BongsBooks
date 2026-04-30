"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  rating: number | null;
}

export default function StarRating({ id, rating: initialRating }: Props) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hovered, setHovered] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleRate(star: number) {
    // Tap same star to clear rating
    const newRating = rating === star ? null : star;
    setRating(newRating);
    setSaving(true);
    try {
      await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: newRating }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  const display = hovered ?? rating ?? 0;

  return (
    <div
      className="bg-white rounded-2xl p-4"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <p className="text-xs font-semibold text-[#8D8D93] uppercase tracking-wide mb-2.5">
        My Rating
      </p>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRate(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            disabled={saving}
            aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
            className="text-2xl transition-transform active:scale-90 disabled:opacity-50 leading-none"
          >
            {star <= display ? "⭐" : "☆"}
          </button>
        ))}
        {rating && (
          <span className="ml-1 text-xs text-[#8D8D93]">{rating}/5</span>
        )}
      </div>
    </div>
  );
}
