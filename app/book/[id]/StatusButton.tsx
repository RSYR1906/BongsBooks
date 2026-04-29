"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Status = "want_to_read" | "reading" | "read" | null;

const STATUSES: { value: Exclude<Status, null>; label: string }[] = [
  { value: "want_to_read", label: "Bookmarked" },
  { value: "reading", label: "Reading" },
  { value: "read", label: "Read" },
];

export default function StatusButton({
  id,
  status: initial,
}: {
  id: string;
  status: Status;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<Status>(initial);
  const [saving, setSaving] = useState(false);

  async function handleStatus(next: Exclude<Status, null>) {
    if (saving) return;
    const newStatus: Status = status === next ? null : next;
    setSaving(true);
    setStatus(newStatus);
    await fetch(`/api/books/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setSaving(false);
    router.refresh();
  }

  return (
    <div>
      <p className="text-xs font-medium text-[#AEAEB2] mb-2 uppercase tracking-wide">
        Reading Status
      </p>
      {/* iOS segmented control */}
      <div
        className="bg-[#E5E5EA] rounded-xl p-1 flex"
        style={{ opacity: saving ? 0.7 : 1 }}
      >
        {STATUSES.map((s) => (
          <button
            key={s.value}
            onClick={() => handleStatus(s.value)}
            disabled={saving}
            className={`flex-1 py-2 text-xs font-medium rounded-[9px] transition-all active:scale-[0.97] disabled:cursor-wait ${
              status === s.value
                ? "bg-white text-[#1C1C1E] font-semibold"
                : "text-[#636366]"
            }`}
            style={
              status === s.value
                ? { boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }
                : {}
            }
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}

