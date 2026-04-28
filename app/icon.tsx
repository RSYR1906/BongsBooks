import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 7,
        background: "linear-gradient(150deg, #3A1800 0%, #1C0800 100%)",
        boxShadow: "0 0 0 1px rgba(197,135,43,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          fontSize: 14,
          fontWeight: 700,
          color: "#C5872B",
          letterSpacing: "-1px",
          fontFamily: "serif",
          lineHeight: 1,
        }}
      >
        BL
      </div>
    </div>,
    { ...size },
  );
}
