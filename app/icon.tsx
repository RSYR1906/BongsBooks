import { readFileSync } from "fs";
import { ImageResponse } from "next/og";
import path from "path";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  const data = readFileSync(path.join(process.cwd(), "public", "app_logo.png"));
  const src = `data:image/png;base64,${data.toString("base64")}`;
  // eslint-disable-next-line @next/next/no-img-element
  return new ImageResponse(
    <img
      src={src}
      width={32}
      height={32}
      alt=""
      style={{ objectFit: "contain" }}
    />,
    { ...size },
  );
}
