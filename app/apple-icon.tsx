import { readFileSync } from "fs";
import { ImageResponse } from "next/og";
import path from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const data = readFileSync(path.join(process.cwd(), "public", "app_logo.png"));
  const src = `data:image/png;base64,${data.toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: 180,
        height: 180,
        background: "#FDFAF4",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 18,
      }}
    >
      <img
        src={src}
        width={144}
        height={144}
        alt=""
        style={{ objectFit: "contain" }}
      />
    </div>,
    { ...size },
  );
}
