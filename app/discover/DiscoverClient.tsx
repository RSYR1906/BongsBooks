"use client";

import { useState } from "react";
import FreeBooksTab from "./FreeBooksTab";
import RecommendationsTab from "./RecommendationsTab";

const TABS = [
  { id: "for-you", label: "⭐ For You" },
  { id: "free", label: "📖 Free Books" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function DiscoverClient() {
  const [activeTab, setActiveTab] = useState<TabId>("for-you");

  return (
    <div className="space-y-4">
      {/* Tab switcher */}
      <div className="flex bg-[#F5EDDA] rounded-xl border border-[#C5872B]/25 overflow-hidden shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-walnut text-amber-100"
                : "text-walnut hover:bg-[#EDE0C8]/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "for-you" && <RecommendationsTab />}
      {activeTab === "free" && <FreeBooksTab />}
    </div>
  );
}
