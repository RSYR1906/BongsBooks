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
      {/* Segmented tab control */}
      <div className="bg-[#EBEBF0] rounded-xl p-1 flex">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-sm font-medium rounded-[9px] transition-all ${
              activeTab === tab.id
                ? "bg-white text-[#3D3D45] font-semibold"
                : "text-[#8D8D93]"
            }`}
            style={
              activeTab === tab.id
                ? { boxShadow: "0 1px 4px rgba(0,0,0,0.12)" }
                : {}
            }
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
