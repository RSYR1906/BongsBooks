import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ size: string }> },
) {
  const { size } = await params;
  const dim = Math.min(Math.max(parseInt(size, 10) || 192, 16), 1024);
  const maskable = request.nextUrl.searchParams.has("maskable");

  // Maskable icons need a safe zone — pad 12% on each side
  const padding = maskable ? Math.round(dim * 0.12) : 0;
  const inner = dim - padding * 2;
  const radius = Math.round(inner * 0.22);
  const fontSize = Math.round(inner * 0.36);
  const subSize = Math.round(inner * 0.1);
  const lineW = Math.round(inner * 0.52);

  return new ImageResponse(
    <div
      style={{
        width: dim,
        height: dim,
        background: "#0E0500",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: inner,
          height: inner,
          borderRadius: radius,
          background: "linear-gradient(150deg, #3A1800 0%, #1C0800 100%)",
          boxShadow: `0 0 0 ${Math.round(inner * 0.008)}px rgba(197,135,43,0.4)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: Math.round(inner * 0.05),
        }}
      >
        <div
          style={{
            fontSize,
            fontWeight: 700,
            color: "#C5872B",
            letterSpacing: "-3px",
            fontFamily: "serif",
            lineHeight: 1,
          }}
        >
          BL
        </div>
        <div
          style={{
            width: lineW,
            height: 1,
            background: "rgba(197,135,43,0.38)",
          }}
        />
        <div
          style={{
            fontSize: subSize,
            color: "rgba(197,135,43,0.55)",
            letterSpacing: "0.22em",
            fontFamily: "sans-serif",
          }}
        >
          LIBRARY
        </div>
      </div>
    </div>,
    { width: dim, height: dim },
  );
}
