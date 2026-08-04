import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#111111",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            width: 330,
            height: 330,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 90,
            background: "#ffffff",
            color: "#111111",
            fontSize: 165,
            fontWeight: 700,
          }}
        >
          BF
        </div>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}