import AppShell from "@/app/components/AppShell";
import DiscoverClient from "./DiscoverClient";

export const metadata = { title: "Discover – My Library" };

export default function DiscoverPage() {
  return (
    <AppShell title="Discover">
      <div className="max-w-2xl mx-auto px-4 py-4">
        <DiscoverClient />
      </div>
    </AppShell>
  );
}
