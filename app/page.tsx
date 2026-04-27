import AppShell from "@/app/components/AppShell";
import type { Book } from "@/lib/database.types";
import { getSupabase } from "@/lib/supabase";
import LibraryClient from "./LibraryClient";

export const revalidate = 0;

export default async function HomePage() {
  const { data: books, error } = await getSupabase()
    .from("books")
    .select("*")
    .order("added_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch books:", error.message);
  }

  return (
    <AppShell title="My Library">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <LibraryClient books={(books as Book[]) ?? []} />
      </div>
    </AppShell>
  );
}
