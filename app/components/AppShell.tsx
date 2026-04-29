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

function BooksIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="5" height="18" rx="1" />
      <rect x="10" y="3" width="5" height="18" rx="1" />
      <path d="M17 5.5l4 1v13l-4-1V5.5z" />
    </svg>
  );
}

function GlobeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9" />
      <path d="M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9" />
      <line x1="3.27" y1="9" x2="20.73" y2="9" />
      <line x1="3.27" y1="15" x2="20.73" y2="15" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function AppShell({
  title,
  backHref,
  rightSlot,
  children,
}: Props) {
  const pathname = usePathname();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const navItems = [
    {
      href: "/",
      label: "Library",
      active: pathname === "/" || pathname.startsWith("/book/"),
    },
    {
      href: "/discover",
      label: "Discover",
      active: pathname.startsWith("/discover"),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5FA]">
      {/* Top bar */}
      <header
        className="glass-panel sticky top-0 z-20"
        style={{ borderBottom: "1px solid rgba(60,60,67,0.12)" }}
      >
        <div
          className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          {backHref ? (
            <>
              <Link
                href={backHref}
                className="flex items-center gap-0.5 text-[#E8A830] text-sm font-medium shrink-0 -ml-1"
              >
                <ChevronLeftIcon />
                Back
              </Link>
              {title && (
                <h1 className="text-sm font-semibold text-[#3D3D45] line-clamp-1 flex-1 text-center">
                  {title}
                </h1>
              )}
            </>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[#E8A830]">
                <BooksIcon size={20} />
              </span>
              <h1 className="font-serif text-lg font-semibold text-[#3D3D45]">
                {title ?? "My Library"}
              </h1>
            </div>
          )}
          <div className="flex items-center gap-3 shrink-0">
            {rightSlot}
            <button
              onClick={handleLogout}
              className="text-[#C2C2C7] hover:text-[#8D8D93] transition-colors text-xs"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Page content — padded for bottom nav */}
      <div className="pb-24">{children}</div>

      {/* Bottom navigation */}
      <nav
        className="glass-panel fixed bottom-0 inset-x-0 z-20"
        style={{
          borderTop: "1px solid rgba(60,60,67,0.12)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="max-w-2xl mx-auto h-16 flex items-end pb-2 px-8 justify-between">
          {/* Library */}
          <Link
            href={navItems[0].href}
            className={`flex flex-col items-center gap-0.5 px-3 transition-colors ${
              navItems[0].active ? "text-[#E8A830]" : "text-[#C2C2C7]"
            }`}
          >
            <BooksIcon size={22} />
            <span className="text-[10px] font-medium">{navItems[0].label}</span>
          </Link>

          {/* Add FAB — centre elevated button */}
          <Link
            href="/add"
            className="flex flex-col items-center gap-0.5 -mt-6 active:scale-95 transition-transform"
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-semibold shadow-lg ${
                pathname.startsWith("/add") ? "bg-[#F5C068]" : "bg-[#E8A830]"
              } text-white`}
              style={{ boxShadow: "0 4px 16px rgba(232,168,48,0.28)" }}
            >
              +
            </div>
            <span
              className={`text-[10px] font-medium ${
                pathname.startsWith("/add")
                  ? "text-[#E8A830]"
                  : "text-[#C2C2C7]"
              }`}
            >
              Add
            </span>
          </Link>

          {/* Discover */}
          <Link
            href={navItems[1].href}
            className={`flex flex-col items-center gap-0.5 px-3 transition-colors ${
              navItems[1].active ? "text-[#E8A830]" : "text-[#C2C2C7]"
            }`}
          >
            <GlobeIcon size={22} />
            <span className="text-[10px] font-medium">{navItems[1].label}</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
