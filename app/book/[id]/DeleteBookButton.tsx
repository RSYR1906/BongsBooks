"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeleteBookButton({ id }: { id: string }) {
  const router = useRouter();
  const [state, setState] = useState<
    "idle" | "confirming" | "deleting" | "error"
  >("idle");

  async function handleDelete() {
    setState("deleting");
    const res = await fetch(`/api/books/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setState("error");
      return;
    }
    router.push("/");
    router.refresh();
  }

  if (state === "error") {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-red-500">Failed to remove book. Please try again.</p>
        <button
          onClick={() => setState("idle")}
          className="text-sm text-[#636366] underline-offset-2 hover:underline"
        >
          Dismiss
        </button>
      </div>
    );
  }

  if (state === "confirming") {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleDelete}
          className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white text-sm font-semibold rounded-xl transition-all"
        >
          Remove
        </button>
        <button
          onClick={() => setState("idle")}
          className="flex-1 py-2.5 bg-[#F2F2F7] text-[#636366] text-sm font-medium rounded-xl hover:bg-[#E5E5EA] transition-all"
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
      className="w-full py-2.5 text-red-500 text-sm font-medium active:scale-[0.98] transition-all disabled:opacity-50"
    >
      {state === "deleting" ? "Removing…" : "Remove from library"}
    </button>
  );
}
