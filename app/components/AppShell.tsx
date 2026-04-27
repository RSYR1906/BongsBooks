"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface Props {
  title?: string;
  backHref?: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

export default function AppShell({
  title,
  backHref,
  rightSlot,
  children,
}: Props) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/",
      icon: "📚",
      label: "Library",
      active: pathname === "/" || pathname.startsWith("/book/"),
    },
    {
      href: "/discover",
      icon: "🔭",
      label: "Discover",
      active: pathname.startsWith("/discover"),
    },
  ];

  return (
    <div className="min-h-screen bg-parchment">
      {/* Top bar */}
      <header className="bg-walnut text-white sticky top-0 z-20 shadow-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          {backHref ? (
            <>
              <Link
                href={backHref}
                className="text-amber-300 hover:text-white transition-colors text-sm font-medium shrink-0"
              >
                ← Back
              </Link>
              {title && (
                <h1 className="text-sm font-medium line-clamp-1 flex-1">
                  {title}
                </h1>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xl">📚</span>
              <h1 className="font-serif text-lg font-semibold">
                {title ?? "My Library"}
              </h1>
            </div>
          )}
          {rightSlot && <div className="shrink-0">{rightSlot}</div>}
        </div>
      </header>

      {/* Page content — padded for bottom nav */}
      <div className="pb-24">{children}</div>

      {/* Bottom navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 z-20 bg-walnut"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-2xl mx-auto h-16 flex items-end pb-2 px-8 justify-between">
          {/* Library */}
          <Link
            href={navItems[0].href}
            className={`flex flex-col items-center gap-0.5 px-3 transition-colors ${
              navItems[0].active
                ? "text-[#C5872B]"
                : "text-amber-200/50 hover:text-amber-200"
            }`}
          >
            <span className="text-2xl leading-none">{navItems[0].icon}</span>
            <span className="text-[10px] font-medium">{navItems[0].label}</span>
          </Link>

          {/* Add FAB — centre elevated button */}
          <Link
            href="/add"
            className="flex flex-col items-center gap-0.5 -mt-6 active:scale-95 transition-transform"
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-xl border-2 ${
                pathname.startsWith("/add")
                  ? "bg-[#E5A84F] border-[#E5A84F]/30 text-white"
                  : "bg-[#C5872B] border-[#C5872B]/30 text-white"
              }`}
            >
              +
            </div>
            <span
              className={`text-[10px] font-medium ${
                pathname.startsWith("/add")
                  ? "text-[#C5872B]"
                  : "text-amber-200/50"
              }`}
            >
              Add
            </span>
          </Link>

          {/* Discover */}
          <Link
            href={navItems[1].href}
            className={`flex flex-col items-center gap-0.5 px-3 transition-colors ${
              navItems[1].active
                ? "text-[#C5872B]"
                : "text-amber-200/50 hover:text-amber-200"
            }`}
          >
            <span className="text-2xl leading-none">{navItems[1].icon}</span>
            <span className="text-[10px] font-medium">{navItems[1].label}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
