"use client";

import Quagga from "@ericblade/quagga2";
import { useEffect, useRef, useState } from "react";

interface Props {
  onScanSuccess: (isbn: string) => void;
}

export default function ScanTab({ onScanSuccess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<
    "idle" | "starting" | "scanning" | "error"
  >("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    startScanner();

    return () => {
      Quagga.offDetected(onDetected);
      try {
        Quagga.stop();
      } catch {
        // ignore if not running
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onDetected(result: { codeResult: { code: string | null } }) {
    const code = result.codeResult.code;
    if (!code) return;
    Quagga.offDetected(onDetected);
    Quagga.stop();
    navigator.vibrate?.(60);
    onScanSuccess(code);
  }

  async function startScanner() {
    if (!containerRef.current) return;
    setStatus("starting");

    try {
      await Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            target: containerRef.current,
            constraints: {
              facingMode: "environment",
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "upc_reader"],
          },
          locate: true,
        },
        (err: Error | null) => {
          if (err) {
            setStatus("error");
            setErrorMsg(
              err.message.includes("Permission")
                ? "Camera permission denied. Please allow camera access and try again."
                : `Camera error: ${err.message}`,
            );
            return;
          }
          Quagga.start();
          Quagga.onDetected(onDetected);
          setStatus("scanning");
        },
      );
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown camera error");
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-parchment-dark rounded-2xl shadow overflow-hidden">
        {/* Camera viewport */}
        <div
          ref={containerRef}
          className="relative w-full aspect-video bg-gray-900"
          style={{ minHeight: 220 }}
        >
          {status === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm animate-pulse">
              Starting camera…
            </div>
          )}
          {status === "error" && (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
              <p className="text-white text-sm">{errorMsg}</p>
            </div>
          )}
          {/* Scan overlay */}
          {status === "scanning" && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-20 border-2 border-gold rounded opacity-80" />
            </div>
          )}
        </div>

        <div className="p-4 text-center">
          {status === "scanning" ? (
            <p className="text-sm text-walnut-mid">
              Point the camera at the barcode on the back of the book
            </p>
          ) : status === "error" ? (
            <button
              onClick={() => {
                startedRef.current = false;
                setStatus("idle");
                setErrorMsg("");
                startScanner();
              }}
              className="bg-gold text-white text-sm font-medium px-4 py-2 rounded-xl active:scale-95 transition-transform"
            >
              Retry
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-walnut-mid/70 text-center">
        The ISBN barcode is the one with 13 digits, usually on the back cover
      </p>
    </div>
  );
}
