"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exiting, setExiting] = useState(false);

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
        setExiting(true);
        await new Promise((r) => setTimeout(r, 340));
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
      className={`min-h-screen flex items-center justify-center px-4 bg-[#F5F5FA] ${exiting ? "login-exit" : "page-enter"}`}
    >
      <div className="w-full max-w-sm">
        {/* Branding */}
        <div className="text-center mb-8 select-none">
          <div
            className="w-20 h-20 rounded-[22px] flex items-center justify-center text-4xl mx-auto mb-4"
            style={{
              background:
                "linear-gradient(145deg, #F5C068 0%, #E8A830 60%, #C5872B 100%)",
              boxShadow: "0 8px 24px rgba(232,168,48,0.22)",
            }}
          >
            📚
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#3D3D45] tracking-tight">
            Bongs Library
          </h1>
          <p className="text-[#8D8D93] text-sm mt-1.5">
            Your personal reading world
          </p>
        </div>

        <div
          className="rounded-2xl overflow-hidden"
          style={{
            boxShadow:
              "0 2px 16px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
          }}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-white px-5 py-5 space-y-3"
          >
            {/* Password field — iOS grouped style */}
            <div className="bg-[#F5F5FA] rounded-xl overflow-hidden">
              <div className="flex items-center px-4">
                <label
                  htmlFor="password"
                  className="text-sm text-[#8D8D93] shrink-0 w-24"
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
                  className="flex-1 bg-transparent py-3 text-sm text-[#3D3D45] focus:outline-none placeholder:text-[#C2C2C7]"
                  placeholder="Required"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#E8A830] hover:bg-[#F5C068] disabled:opacity-50 text-white font-semibold rounded-xl px-4 py-3 text-sm transition-colors active:scale-[0.98]"
              style={{ boxShadow: "0 2px 8px rgba(232,168,48,0.22)" }}
            >
              {loading ? "Checking…" : "Enter Library"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
