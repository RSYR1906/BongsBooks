"use client";

import AppShell from "@/app/components/AppShell";
import { useState } from "react";
import CsvTab from "./CsvTab";
import ScanTab from "./ScanTab";
import SearchTab from "./SearchTab";

const TABS = [
  { id: "Search", icon: "🔍", label: "Search" },
  { id: "Scan", icon: "📷", label: "Scan" },
  { id: "CSV", icon: "📄", label: "Import" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export default function AddBookPage() {
  const [activeTab, setActiveTab] = useState<TabId>("Search");

  return (
    <AppShell title="Add a Book" backHref="/">
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
        {/* Tab switcher */}
        <div className="flex bg-card rounded-xl border border-parchment-dark overflow-hidden shadow-sm">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 flex flex-col items-center gap-0.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-walnut text-white"
                  : "text-walnut-mid hover:bg-parchment-dark/40"
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {activeTab === "Search" && <SearchTab />}
        {activeTab === "Scan" && (
          <ScanTab
            onScanSuccess={(isbn) => {
              setActiveTab("Search");
              sessionStorage.setItem("scan_isbn", isbn);
            }}
          />
        )}
        {activeTab === "CSV" && <CsvTab />}
      </div>
    </AppShell>
  );
}
