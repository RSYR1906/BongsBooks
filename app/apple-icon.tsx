import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        borderRadius: 38,
        background: "linear-gradient(150deg, #3A1800 0%, #1C0800 100%)",
        boxShadow: "0 0 0 3px rgba(197,135,43,0.35)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <div
        style={{
          fontSize: 68,
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
          width: 90,
          height: 1,
          background: "rgba(197,135,43,0.4)",
        }}
      />
      <div
        style={{
          fontSize: 16,
          color: "rgba(197,135,43,0.6)",
          letterSpacing: "0.25em",
          fontFamily: "sans-serif",
        }}
      >
        LIBRARY
      </div>
    </div>,
    { ...size },
  );
}
