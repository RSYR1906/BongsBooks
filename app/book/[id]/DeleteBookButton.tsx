"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteBookButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "confirming" | "deleting">(
    "idle",
  );

  async function handleDelete() {
    setState("deleting");
    await fetch(`/api/books/${id}`, { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  if (state === "confirming") {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white text-sm font-semibold rounded-2xl transition-all"
        >
          Yes, remove it
        </button>
        <button
          onClick={() => setState("idle")}
          className="flex-1 py-2.5 bg-card border border-parchment-dark text-walnut-mid text-sm font-medium rounded-2xl hover:border-gold/30 transition-all"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState("confirming")}
      disabled={state === "deleting"}
      className="w-full py-2.5 bg-card border border-red-200 text-red-500 text-sm font-medium rounded-2xl hover:bg-red-50 active:scale-[0.98] transition-all disabled:opacity-50"
    >
      {state === "deleting" ? "Removing…" : "🗑 Remove from library"}
    </button>
  );
}
