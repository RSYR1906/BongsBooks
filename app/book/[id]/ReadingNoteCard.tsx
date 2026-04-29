"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function ReadingNoteCard({
  id,
  note,
}: {
  id: string;
  note: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(note ?? "");
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function startEdit() {
    setEditing(true);
    // Focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reading_note: value.trim() || null }),
      });
      setEditing(false);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setValue(note ?? "");
    setEditing(false);
  }

  return (
    <div className="mb-5 bg-[#F5F5FA] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif font-semibold text-[#3D3D45]">
          📌 Reading Note
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-xs text-[#E8A830] font-medium hover:underline"
          >
            {value ? "Edit" : "Add note"}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2.5">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            placeholder="e.g. Stopped at Chapter 12, page 184 — the protagonist just arrived in the city…"
            className="w-full bg-white rounded-xl px-3 py-2.5 text-sm text-[#3D3D45] focus:outline-none resize-none placeholder:text-[#C2C2C7] border border-[#EBEBF0]"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="flex-1 border border-[#EBEBF0] text-[#8D8D93] text-sm font-medium py-2 rounded-xl hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-[#E8A830] hover:bg-[#F5C068] disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-xl transition-colors active:scale-[0.98]"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : value ? (
        <p
          className="text-sm text-[#3D3D45] leading-relaxed whitespace-pre-wrap cursor-pointer"
          onClick={startEdit}
        >
          {value}
        </p>
      ) : (
        <button
          onClick={startEdit}
          className="w-full text-sm text-[#C2C2C7] text-left py-2 hover:text-[#8D8D93] transition-colors"
        >
          Tap to add a note — e.g. where you stopped reading…
        </button>
      )}
    </div>
  );
}
