"use client";

import Papa from "papaparse";
import { useRef, useState } from "react";

interface CsvRow {
  title?: string;
  author?: string;
  isbn?: string;
  [key: string]: string | undefined;
}

type Status = "idle" | "parsing" | "uploading" | "done" | "error";

export default function CsvTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [preview, setPreview] = useState<CsvRow[]>([]);
  const [message, setMessage] = useState("");
  const [insertedCount, setInsertedCount] = useState(0);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus("parsing");

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
      complete(results) {
        const rows = results.data.filter((r) => r.title?.trim());
        if (rows.length === 0) {
          setStatus("error");
          setMessage(
            "No valid rows found. Make sure the CSV has a 'title' column.",
          );
          return;
        }
        setPreview(rows.slice(0, 5));
        setStatus("idle");
        setMessage(
          `${rows.length} book${rows.length === 1 ? "" : "s"} ready to import`,
        );
        // Store all rows for upload
        (
          fileRef as React.MutableRefObject<
            HTMLInputElement & { _rows?: CsvRow[] }
          >
        ).current!._rows = rows;
      },
      error(err: Error) {
        setStatus("error");
        setMessage(`Parse error: ${err.message}`);
      },
    });
  }

  async function handleUpload() {
    const rows = (
      fileRef as React.MutableRefObject<HTMLInputElement & { _rows?: CsvRow[] }>
    ).current?._rows;
    if (!rows || rows.length === 0) return;
    setStatus("uploading");

    const books = rows.map((r) => ({
      title: r.title!.trim(),
      author: r.author?.trim() || null,
      isbn: r.isbn?.trim() || null,
    }));

    try {
      const res = await fetch("/api/books/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ books }),
      });
      const data = await res.json();
      if (res.ok) {
        setInsertedCount(data.inserted ?? books.length);
        setStatus("done");
      } else {
        setStatus("error");
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div className="bg-card border border-parchment-dark rounded-2xl shadow p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <p className="font-semibold text-walnut">
          {insertedCount} books imported!
        </p>
        <button
          onClick={() => {
            setStatus("idle");
            setPreview([]);
            setMessage("");
            if (fileRef.current) fileRef.current.value = "";
          }}
          className="bg-gold text-white text-sm font-medium px-5 py-2 rounded-xl active:scale-95 transition-transform"
        >
          Import Another File
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-parchment-dark rounded-2xl shadow p-5 space-y-4">
        <p className="text-sm text-walnut-mid">
          Upload a <strong>.csv</strong> file with columns:{" "}
          <code className="bg-parchment-dark px-1 rounded text-xs">title</code>,{" "}
          <code className="bg-parchment-dark px-1 rounded text-xs">author</code>
          , <code className="bg-parchment-dark px-1 rounded text-xs">isbn</code>{" "}
          (only title is required)
        </p>

        <label className="block w-full border-2 border-dashed border-gold/40 rounded-xl py-6 text-center cursor-pointer hover:border-gold/70 transition-colors">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={handleFile}
          />
          <span className="text-3xl block mb-1">📄</span>
          <span className="text-sm text-walnut-mid font-medium">
            {status === "parsing" ? "Parsing…" : "Tap to choose a CSV file"}
          </span>
        </label>

        {message && (
          <p
            className={`text-sm rounded-lg px-3 py-2 ${
              status === "error"
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {message}
          </p>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-parchment-dark">
            <table className="text-xs w-full">
              <thead className="bg-parchment-dark/50">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-walnut-mid">
                    Title
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-walnut-mid">
                    Author
                  </th>
                  <th className="text-left px-3 py-2 font-medium text-walnut-mid">
                    ISBN
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-parchment-dark">
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 max-w-[140px] truncate text-walnut">
                      {row.title}
                    </td>
                    <td className="px-3 py-2 max-w-[120px] truncate text-walnut-mid">
                      {row.author ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-walnut-mid">
                      {row.isbn ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length < parseInt(message) && (
              <p className="text-xs text-walnut-mid/60 text-center py-1">
                Showing first 5 rows
              </p>
            )}
          </div>
        )}

        {preview.length > 0 && status !== "uploading" && (
          <button
            onClick={handleUpload}
            className="w-full bg-gold hover:bg-gold-light text-white text-sm font-semibold py-2.5 rounded-xl transition-colors active:scale-[0.98]"
          >
            Import All Books
          </button>
        )}

        {status === "uploading" && (
          <p className="text-center text-sm text-walnut-mid animate-pulse">
            Importing books…
          </p>
        )}
      </div>
    </div>
  );
}
