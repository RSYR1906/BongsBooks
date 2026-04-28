"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError("Incorrect password");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse 140% 120% at 50% 0%, #5C2A0A 0%, #3D1F00 45%, #1C0A00 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8 select-none">
          <div className="text-7xl mb-3 drop-shadow-lg">📚</div>
          <h1 className="font-serif text-4xl font-bold text-amber-50 tracking-tight">
            Bongs Library
          </h1>
          <div className="flex items-center gap-3 justify-center mt-3">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#8B6914]/60" />
            <span className="text-[#C5872B]/80 text-[10px] tracking-[0.3em] uppercase font-medium">
              Est. 2024
            </span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#8B6914]/60" />
          </div>
          <p className="text-amber-300/60 text-sm mt-2">
            Your personal reading world
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: "#FFFDF7",
            border: "1px solid rgba(139,105,20,0.3)",
            boxShadow:
              "0 20px 60px rgba(0,0,0,0.45), 0 0 0 1px rgba(139,105,20,0.08)",
          }}
        >
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-walnut mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className="w-full border border-parchment-dark rounded-xl px-3 py-2.5 text-sm bg-parchment focus:outline-none focus:ring-2 focus:ring-gold/40 text-walnut placeholder:text-walnut-mid/30"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 border border-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-gold-light disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors active:scale-[0.98] shadow-md"
          >
            {loading ? "Checking…" : "Enter Library"}
          </button>
        </form>
      </div>
    </main>
  );
}
