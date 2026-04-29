"use client";

import type { Book } from "@/lib/database.types";
import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useState } from "react";

export default function EditBookForm({ book }: { book: Book }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: book.title,
    author: book.author ?? "",
    genre: book.genre?.join(", ") ?? "",
    description: book.description ?? "",
    cover_url: book.cover_url ?? "",
  });

  function field(key: keyof typeof form) {
    return {
      value: form[key],
      onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  async function handleSave() {
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch(`/api/books/${book.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title.trim(),
        author: form.author.trim() || null,
        genre: form.genre
          ? form.genre
              .split(",")
              .map((g) => g.trim())
              .filter(Boolean)
          : null,
        description: form.description.trim() || null,
        cover_url: form.cover_url.trim() || null,
      }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  const rowCls =
    "flex items-start gap-3 px-4 py-2.5 border-b border-black/[0.06] last:border-0";

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 text-[#C5872B] text-sm font-medium rounded-2xl active:scale-[0.98] transition-all"
      >
        Edit book details
      </button>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden bg-[#F2F2F7]">
      <div className="px-4 pt-4 pb-2">
        <h3 className="font-semibold text-[#1C1C1E] text-sm">Edit details</h3>
      </div>
      <div className="bg-white rounded-xl mx-3 mb-3 overflow-hidden">
        <div className={rowCls}>
          <span className="text-xs text-[#636366] w-20 shrink-0 pt-2.5">Title *</span>
          <input
            className="flex-1 bg-transparent py-2 text-sm text-[#1C1C1E] focus:outline-none placeholder:text-[#AEAEB2]"
            placeholder="Title"
            {...field("title")}
          />
        </div>
        <div className={rowCls}>
          <span className="text-xs text-[#636366] w-20 shrink-0 pt-2.5">Author</span>
          <input
            className="flex-1 bg-transparent py-2 text-sm text-[#1C1C1E] focus:outline-none placeholder:text-[#AEAEB2]"
            placeholder="Author"
            {...field("author")}
          />
        </div>
        <div className={rowCls}>
          <span className="text-xs text-[#636366] w-20 shrink-0 pt-2.5">Genres</span>
          <input
            className="flex-1 bg-transparent py-2 text-sm text-[#1C1C1E] focus:outline-none placeholder:text-[#AEAEB2]"
            placeholder="Fiction, Historical, …"
            {...field("genre")}
          />
        </div>
        <div className={rowCls}>
          <span className="text-xs text-[#636366] w-20 shrink-0 pt-2.5">Cover URL</span>
          <input
            className="flex-1 bg-transparent py-2 text-sm text-[#1C1C1E] focus:outline-none placeholder:text-[#AEAEB2]"
            placeholder="https://…"
            {...field("cover_url")}
          />
        </div>
        <div className={rowCls}>
          <span className="text-xs text-[#636366] w-20 shrink-0 pt-2.5">About</span>
          <textarea
            className="flex-1 bg-transparent py-2 text-sm text-[#1C1C1E] focus:outline-none resize-none h-20 placeholder:text-[#AEAEB2]"
            placeholder="Description…"
            {...field("description")}
          />
        </div>
      </div>
      <div className="flex gap-2 px-3 pb-4">
        <button
          onClick={() => setOpen(false)}
          className="flex-1 py-2.5 text-sm font-medium bg-white border border-[#E5E5EA] text-[#636366] rounded-xl hover:bg-[#F2F2F7] transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.title.trim()}
          className="flex-1 py-2.5 text-sm font-semibold bg-[#C5872B] text-white rounded-xl hover:bg-[#E5A84F] disabled:opacity-50 active:scale-[0.98] transition-all"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
