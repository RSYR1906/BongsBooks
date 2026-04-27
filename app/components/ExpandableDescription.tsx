"use client";

import { useState } from "react";

interface Props {
  text: string;
  maxLength?: number;
}

export default function ExpandableDescription({
  text,
  maxLength = 300,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > maxLength;

  return (
    <div>
      <p
        className={`text-sm text-walnut-mid leading-relaxed transition-all ${
          !expanded && isLong ? "line-clamp-4" : ""
        }`}
      >
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-1.5 text-gold text-sm font-medium hover:text-gold-light transition-colors"
        >
          {expanded ? "Show less ↑" : "Show more ↓"}
        </button>
      )}
    </div>
  );
}
