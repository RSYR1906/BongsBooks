"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  id: string;
  collections: string[] | null;
}

export default function CollectionsCard({ id, collections: initial }: Props) {
  const router = useRouter();
  const [collections, setCollections] = useState<string[]>(initial ?? []);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(updated: string[]) {
    setSaving(true);
    try {
      await fetch(`/api/books/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          collections: updated.length > 0 ? updated : null,
        }),
      });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function handleAdd() {
    const name = input.trim();
    if (!name || collections.includes(name)) {
      setInput("");
      return;
    }
    const updated = [...collections, name];
    setCollections(updated);
    setInput("");
    save(updated);
  }

  function handleRemove(name: string) {
    const updated = collections.filter((c) => c !== name);
    setCollections(updated);
    save(updated);
  }

  return (
    <div
      className="bg-white rounded-2xl p-4 mb-4"
      style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
    >
      <p className="text-xs font-semibold text-[#8D8D93] uppercase tracking-wide mb-2.5">
        Collections
      </p>

      {collections.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {collections.map((c) => (
            <span
              key={c}
              className="flex items-center gap-1 text-xs bg-[#F5F5FA] text-[#3D3D45] px-2.5 py-1 rounded-full font-medium"
            >
              📁 {c}
              <button
                onClick={() => handleRemove(c)}
                disabled={saving}
                className="text-[#C2C2C7] hover:text-[#8D8D93] leading-none ml-0.5"
                aria-label={`Remove from ${c}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#C2C2C7] mb-3">
          Not in any collection yet.
        </p>
      )}

      {/* Add input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add to collection…"
          maxLength={50}
          className="flex-1 bg-[#F5F5FA] rounded-xl px-3 py-2 text-xs text-[#3D3D45] focus:outline-none placeholder:text-[#C2C2C7]"
        />
        <button
          onClick={handleAdd}
          disabled={!input.trim() || saving}
          className="px-3 py-2 bg-[#E8A830] disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-opacity active:scale-95"
        >
          Add
        </button>
      </div>
    </div>
  );
}
